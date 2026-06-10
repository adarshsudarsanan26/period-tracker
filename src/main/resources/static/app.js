// LunaFlow Application JavaScript

const API_BASE = (window.location.protocol === 'file:' || window.location.port !== '8080')
    ? 'http://localhost:8080/api'
    : '/api';

// Safe wrapper for localStorage to prevent crashes in sandboxed or file:// environments
const safeStorage = {
    getItem(key) {
        try {
            return window.localStorage.getItem(key);
        } catch (e) {
            console.warn('localStorage access denied, using fallback memory storage:', e);
            return this.fallbackStore[key] || null;
        }
    },
    setItem(key, value) {
        try {
            window.localStorage.setItem(key, value);
        } catch (e) {
            console.warn('localStorage write denied, using fallback memory storage:', e);
            this.fallbackStore[key] = String(value);
        }
    },
    fallbackStore: {}
};

// Application State
const state = {
    user: null,
    predictions: null,
    periods: [],
    dailyLogs: [],
    selectedDate: new Date(),
    currentCalendarDate: new Date(),
    charts: {
        mood: null,
        symptom: null,
        cycle: null
    }
};

let activeResetToken = null;
let partnerDashboardPollInterval = null;

// EMOJI to Value mappings for Charting
const MOOD_VALUES = {
    '😊': 5, // Happy
    '😐': 4, // Normal
    '😴': 3, // Tired
    '🤐': 2, // Silent
    '😔': 1, // Sad
    '😡': 1  // Angry
};

const MOOD_COLORS = {
    '😊': '#2bcbba',
    '😐': '#a18cd1',
    '😴': '#f7b731',
    '🤐': '#8d859d',
    '😔': '#ff758c',
    '😡': '#fa8231'
};

// Symptom Remedies Directory Database (Covers 60+ symptoms across all categories)
const SYMPTOM_DIRECTORY = {
    // 1. Physical Symptoms
    'Cramps': {
        category: 'physical',
        why: 'Prostaglandins trigger contractions of the uterine muscle to shed its lining.',
        remedy: 'Apply a heating pad to the lower abdomen, take a warm bath, or drink warm chamomile tea.',
        hydration: 'Drink plenty of warm water to help ease muscle contractions and reduce water retention.',
        exercise: 'Try gentle stretching or restorative yoga poses like Child\'s Pose or Cat-Cow.',
        recovery: 'Prioritize rest, use comfortable bedding, and avoid heavy lifting or high-intensity workouts.'
    },
    'Pelvic pain': {
        category: 'physical',
        why: 'Pelvic congestion and inflammation caused by hormonal shifts before bleeding begins.',
        remedy: 'Use a warm compress on the pelvis. Take warm epsom salt baths.',
        hydration: 'Drink warm water with ginger or lemon to reduce pelvic inflammation.',
        exercise: 'Restorative yoga (Reclined Butterfly pose, Supported Bridge pose).',
        recovery: 'Lie down with a cushion supporting your knees to ease pressure on the pelvis.'
    },
    'Lower back pain': {
        category: 'physical',
        why: 'Uterine contractions and prostaglandin release radiate pain to the lower back muscles.',
        remedy: 'Apply heat wraps or a hot water bottle to the lumbar region. Gentle back massage.',
        hydration: 'Drink plenty of water to prevent muscle dehydration which worsens back pain.',
        exercise: 'Perform gentle knee-to-chest stretches and hamstring stretches.',
        recovery: 'Avoid standing or sitting in one position for long periods; rest on your side with a pillow between your knees.'
    },
    'Headache': {
        category: 'physical',
        why: 'Fluctuations in estrogen levels trigger vascular changes in the brain.',
        remedy: 'Cold compress on the forehead. Rest in a dark, quiet room.',
        hydration: 'Drink water consistently; low hydration exacerbates hormone headaches.',
        exercise: 'Gentle neck stretches and breathing exercises.',
        recovery: 'Limit screen time; aim for a quiet environment and try to sleep.'
    },
    'Migraine': {
        category: 'physical',
        why: 'Severe drop in estrogen (menstrual migraine) triggers neurological sensitivities.',
        remedy: 'Rest in a completely dark room; avoid sensory triggers (lights, noise, strong smells).',
        hydration: 'Drink electrolyte water. Avoid caffeine and chocolate which can trigger migraines.',
        exercise: 'Avoid exercise during an active migraine; rest is the primary option.',
        recovery: 'Prioritize uninterrupted sleep and limit cognitive load.'
    },
    'Breast tenderness': {
        category: 'physical',
        why: 'Hormonal spikes in progesterone and estrogen cause breast tissues and ducts to swell.',
        remedy: 'Wear a supportive, wireless bra. Apply cool compresses or warm compresses (whichever feels better).',
        hydration: 'Reduce sodium intake to lessen swelling; drink water to flush out excess salt.',
        exercise: 'Low-impact movements; avoid bouncing activities like running or jumping.',
        recovery: 'Avoid pressure on the chest; sleep on your back or side with a support pillow.'
    },
    'Bloating': {
        category: 'physical',
        why: 'Progesterone slows down digestion; estrogen drops lead to temporary water retention.',
        remedy: 'Eat smaller, frequent meals. Avoid sodium-heavy foods and gassy vegetables (beans, broccoli).',
        hydration: 'Drink warm water with fennel seeds or peppermint tea to relieve trapped gas.',
        exercise: 'A moderate, gentle walk for 15-20 minutes stimulates intestinal contractions.',
        recovery: 'Wear loose-fitting clothing to avoid abdominal pressure.'
    },
    'Water retention': {
        category: 'physical',
        why: 'Hormonal fluctuations affect aldosterone levels, causing kidneys to hold more sodium and water.',
        remedy: 'Reduce dietary salt. Consume potassium-rich foods (bananas, spinach, avocados).',
        hydration: 'Paradoxically, drinking more water helps flush out excess retained fluids.',
        exercise: 'Light walking or cycling helps circulate fluids and reduce limb swelling.',
        recovery: 'Elevate your feet on a pillow when resting to promote fluid drainage.'
    },
    'Fatigue': {
        category: 'physical',
        why: 'Progesterone levels spike in the luteal phase (causing drowsiness) and drop sharply right before the period.',
        remedy: 'Keep daily schedules light. Nap for 20 minutes if needed.',
        hydration: 'Drink cold water to boost alertness; avoid sugary energy drinks which cause crashes.',
        exercise: 'Short, light walk in fresh air to stimulate energy levels without depleting reserves.',
        recovery: 'Aim for 8-9 hours of sleep; avoid screens at least 1 hour before bedtime.'
    },
    'Dizziness': {
        category: 'physical',
        why: 'Hormonal changes affect blood pressure and blood sugar levels; blood loss can also contribute.',
        remedy: 'Sit or lie down immediately. Avoid sudden posture changes (standing up too fast).',
        hydration: 'Drink water with electrolytes or fruit juice to restore glucose levels.',
        exercise: 'Rest is recommended; avoid balance-heavy exercises.',
        recovery: 'Ensure you are eating iron-rich foods and resting.'
    },
    'Nausea': {
        category: 'physical',
        why: 'Prostaglandins entering the bloodstream can affect the digestive tract lining, causing mild nausea.',
        remedy: 'Sip ginger tea or suck on peppermint candy. Eat dry crackers or toast.',
        hydration: 'Take small, frequent sips of cool water or electrolyte solutions.',
        exercise: 'Rest in a ventilated room; avoid physical strain.',
        recovery: 'Keep head elevated; rest in a cool environment.'
    },
    'Acne': {
        category: 'physical',
        why: 'Progesterone surges stimulate sebum (oil) production, blocking pores.',
        remedy: 'Cleanse face with gentle, non-comedogenic washes. Avoid popping spots.',
        hydration: 'Drink plenty of water to assist skin cellular health.',
        exercise: 'Wash face immediately after working out to remove sweat and oils.',
        recovery: 'Avoid heavy makeup; keep pillowcases clean.'
    },
    'Oily skin': {
        category: 'physical',
        why: 'Androgen and progesterone levels stimulate sebaceous glands.',
        remedy: 'Use oil-free moisturizers and clay masks. Blotting papers.',
        hydration: 'Hydrate well; dehydrated skin can overcompensate by producing more oil.',
        exercise: 'Tie hair back during workouts; cleanse skin post-exercise.',
        recovery: 'Maintain a clean skincare routine; avoid oily foods.'
    },
    'Dry skin': {
        category: 'physical',
        why: 'Low estrogen levels right before and during the period decrease skin moisture retention.',
        remedy: 'Apply rich, hydrating moisturizers containing hyaluronic acid or ceramides.',
        hydration: 'Drink 8-10 glasses of water daily to hydrate skin from within.',
        exercise: 'Avoid hot showers after workouts as they dry out skin further; use lukewarm water.',
        recovery: 'Use a humidifier in dry rooms.'
    },
    'Hair fall': {
        category: 'physical',
        why: 'Drop in estrogen levels right before menstruation can trigger temporary shedding.',
        remedy: 'Avoid harsh chemical hair treatments or tight hairstyles (buns/ponytails).',
        hydration: 'Keep hydrated and eat foods rich in iron, zinc, and biotin.',
        exercise: 'Scale back on stress-heavy workouts, as high cortisol increases hair shedding.',
        recovery: 'Gentle scalp massage; get restorative sleep to help cellular repair.'
    },
    'Increased appetite': {
        category: 'physical',
        why: 'Your basal metabolic rate rises slightly during the luteal phase, requiring more calories.',
        remedy: 'Eat complex carbohydrates (oatmeal, brown rice) and protein to stay full longer.',
        hydration: 'Drink a glass of water before meals; thirst is often mistaken for hunger.',
        exercise: 'Keep up moderate activity to regulate appetite hormones.',
        recovery: 'Listen to your body; it is normal to eat slightly more. Avoid guilt.'
    },
    'Reduced appetite': {
        category: 'physical',
        why: 'Digestive slowdown or nausea due to prostaglandin surges can reduce hunger.',
        remedy: 'Eat small, nutrient-dense snacks (nuts, fruit, yogurt) instead of large meals.',
        hydration: 'Sip fruit smoothies or broths to get calories and stay hydrated.',
        exercise: 'Light walking can help stimulate digestive appetite.',
        recovery: 'Rest and do not force heavy meals; focus on hydration.'
    },
    'Food cravings': {
        category: 'physical',
        why: 'Drop in serotonin levels triggers cravings for fast-energy foods like chocolate and simple carbs.',
        remedy: 'Allow yourself dark chocolate (70%+). Eat balanced snacks matching sweet/salty tastes.',
        hydration: 'Drink water or flavored herbal teas (licorice, peppermint) to curb sweet cravings.',
        exercise: 'Light exercise releases endorphins, which satisfies the brain\'s craving for dopamine.',
        recovery: 'Sleep deprivation increases cravings; sleep more to control ghrelin levels.'
    },
    'Sleepiness': {
        category: 'physical',
        why: 'High progesterone levels in the luteal phase act as a natural sedative.',
        remedy: 'Take short 15-20 min power naps in the early afternoon. Step into bright natural light.',
        hydration: 'Drink cold water or green tea for a gentle, stable energy boost.',
        exercise: 'Light stretching or walking near window light clears brain fog.',
        recovery: 'Go to bed earlier; avoid heavy late meals.'
    },
    'Insomnia': {
        category: 'physical',
        why: 'Estrogen and progesterone drop right before bleeding, disrupting body temperature regulation.',
        remedy: 'Keep the bedroom cool (65-68°F). Avoid screens 2 hours before bed.',
        hydration: 'Drink warm chamomile or lavender tea; avoid caffeine after noon.',
        exercise: 'Exercise in the morning or afternoon; avoid intense workouts late at night.',
        recovery: 'Create a calming bedtime ritual (reading, meditation, warm bath).'
    },
    'Digestive issues': {
        category: 'physical',
        why: 'Prostaglandins trigger contractions not just in the uterus, but in the bowels as well.',
        remedy: 'Avoid dairy, heavy fats, and carbonated beverages. Eat fiber-rich foods.',
        hydration: 'Drink warm water or ginger tea to soothe the gut lining.',
        exercise: 'Gentle core twist stretches or walking aids peristalsis.',
        recovery: 'Allow time for digestion; avoid lying down immediately after eating.'
    },
    'Constipation': {
        category: 'physical',
        why: 'High progesterone levels before the period relax bowel muscles, slowing transit times.',
        remedy: 'Increase dietary fiber (chia seeds, flaxseeds, prunes, leafy greens).',
        hydration: 'Drink plenty of room-temperature water; fiber needs hydration to work.',
        exercise: 'Regular walking and core-stretching yoga stimulates bowel movement.',
        recovery: 'Establish a regular bathroom routine; avoid rushing.'
    },
    'Diarrhea': {
        category: 'physical',
        why: 'Excess prostaglandins cause the smooth muscles in the intestines to contract and empty.',
        remedy: 'Follow the BRAT diet (Bananas, Rice, Applesauce, Toast). Avoid spicy/greasy foods.',
        hydration: 'Drink electrolyte-replacing beverages to prevent dehydration.',
        exercise: 'Rest is recommended; avoid high-impact workouts.',
        recovery: 'Rest and keep warm; a heating pad on the stomach can soothe intestinal spasms.'
    },

    // 2. Emotional Symptoms
    'Mood swings': {
        category: 'emotional',
        why: 'Rapid shifts in estrogen and progesterone impact neurotransmitters like serotonin and dopamine.',
        remedy: 'Practice mindfulness, track mood triggers, and take deep, slow breaths.',
        selfcare: 'Allow yourself time off from high-pressure commitments. Treat yourself gently.',
        partner: [
            'Recognize that these mood swings are hormonal and not a personal attack.',
            'Offer comforting gestures (a warm drink, hug, or quiet time together).',
            'Avoid trying to "fix" her mood; just provide a calm, supportive environment.'
        ]
    },
    'Irritability': {
        category: 'emotional',
        why: 'Low estrogen levels reduce tolerance thresholds for stress and noise.',
        remedy: 'Step away from triggering situations. Count to 10 and do deep breathing.',
        selfcare: 'Spend time alone in a quiet, low-sensory environment. Limit caffeine.',
        partner: [
            'Speak in a calm, soft tone; avoid reacting with irritation or defensiveness.',
            'Help with daily chores to reduce her mental load and stress triggers.',
            'Give her space if she requests it, and check in gently later.'
        ]
    },
    'Anger': {
        category: 'emotional',
        why: 'Fluctuations in progesterone drop serotonin levels, lowering emotional regulation capacity.',
        remedy: 'Engage in a solo cooling-down activity. Write down what angered you to process it.',
        selfcare: 'Do a high-energy workout to release physical tension, or write in a journal.',
        partner: [
            'Listen calmly without debating or offering immediate solutions.',
            'Avoid escalating arguments. Say: "I hear you, let\'s take a moment to cool down."',
            'Reassure her that her feelings are valid, but avoid bringing up past conflicts.'
        ]
    },
    'Emotional sensitivity': {
        category: 'emotional',
        why: 'Hormonal drops increase emotional receptivity and vulnerability.',
        remedy: 'Remind yourself that your feelings are amplified by hormones right now.',
        selfcare: 'Watch a comforting movie, avoid sad news, and wrap yourself in cozy blankets.',
        partner: [
            'Be extra gentle with your words; avoid jokes that could be taken critically.',
            'Provide warm validation: "I understand why you feel that way. I am here for you."',
            'Cook her favorite meal or make her comfortable.'
        ]
    },
    'Crying easily': {
        category: 'emotional',
        why: 'Sudden estrogen drops weaken emotional barriers, making tears a natural stress release.',
        remedy: 'Let the tears flow. Crying releases oxytocin and endorphins, acting as a relief valve.',
        selfcare: 'Have a warm shower, cry if you need to, and write down your feelings afterwards.',
        partner: [
            'Hold her close and offer comfort without asking "Why are you crying?"',
            'Provide tissues, water, and reassure her that it is okay to cry.',
            'Avoid telling her she is "too sensitive" or dismissive remarks.'
        ]
    },
    'Feeling overwhelmed': {
        category: 'emotional',
        why: 'Hormonal exhaustion makes standard daily demands feel insurmountably heavy.',
        remedy: 'Write a small "today only" list with just 1 or 2 items. Postpone other tasks.',
        selfcare: 'Practice box breathing (inhale 4s, hold 4s, exhale 4s, hold 4s). Meditate.',
        partner: [
            'Take over administrative or household tasks without being asked (cooking, cleaning).',
            'Encourage her to rest: "Take a break, I will handle everything tonight."',
            'Help her break down decisions into small, manageable options.'
        ]
    },
    'Feeling lonely': {
        category: 'emotional',
        why: 'Progesterone drops can trigger a sense of emotional isolation and vulnerability.',
        remedy: 'Reach out to a close friend or family member for a simple chat.',
        selfcare: 'Engage in a comforting solo activity like reading or crafts. Hug a soft pillow.',
        partner: [
            'Spend quality time together without screens (cuddle, watch a movie, walk).',
            'Remind her frequently that she is loved, valued, and not alone.',
            'Send sweet check-in messages during the day.'
        ]
    },
    'Feeling unsupported': {
        category: 'emotional',
        why: 'Hormonal stress increases the need for emotional safety, making small gaps feel large.',
        remedy: 'Express your needs clearly: "I am feeling vulnerable today, I just need a hug/talk."',
        selfcare: 'Practice self-compassion affirmations. Do something nice for yourself.',
        partner: [
            'Ask directly: "How can I support you best today? Do you need space, comfort, or help?"',
            'Show active support by listening attentively without looking at your phone.',
            'Verbally acknowledge all her efforts and express appreciation.'
        ]
    },
    'Feeling insecure': {
        category: 'emotional',
        why: 'Fluctuations in estrogen affect self-perception and confidence levels.',
        remedy: 'Avoid looking in mirrors critically or editing profiles today. Reframe negative self-talk.',
        selfcare: 'Wear comfortable, loose clothing that makes you feel good. List 3 things you love about yourself.',
        partner: [
            'Provide sincere, unprompted compliments about her appearance and personality.',
            'Reassure her of your commitment and affection.',
            'Avoid pointing out physical flaws or comparing her to others.'
        ]
    },
    'Frustration': {
        category: 'emotional',
        why: 'Reduced patience due to exhaustion makes small delays feel highly frustrating.',
        remedy: 'Take a break from the frustrating task. Do a 2-minute stretch.',
        selfcare: 'Practice mindfulness. Focus on what you can control right now.',
        partner: [
            'Be patient; expect tasks to take slightly longer.',
            'Help solve simple friction points (e.g. fix a stuck drawer, find keys).',
            'Reassure her when things don\'t go as planned.'
        ]
    },
    'Jealousy': {
        category: 'emotional',
        why: 'Vulnerability and insecurity peaks during the luteal phase can heighten possessiveness.',
        remedy: 'Acknowledge that hormones are amplifying insecurities. Postpone serious relationship discussions.',
        selfcare: 'Limit social media scrolling. Journal your fears to release them.',
        partner: [
            'Be transparent and reassuring in your conversations.',
            'Show loyalty and remind her of your bond.',
            'Avoid triggering defensive reactions; respond with patience.'
        ]
    },
    'Emotional exhaustion': {
        category: 'emotional',
        why: 'Coping with physical discomfort and mood shifts drains cognitive reserves.',
        remedy: 'Go into "low energy mode". Cancel non-essential meetings. Do absolutely nothing.',
        selfcare: 'Sleep, sit in nature, or take a long warm bath. Turn off notifications.',
        partner: [
            'Minimize external demands on her time and energy.',
            'Create a quiet, peaceful home environment (low lights, soft music).',
            'Offer a gentle foot or back massage to help her unwind.'
        ]
    },
    'Need for affection': {
        category: 'emotional',
        why: 'Progesterone drops trigger a biological craving for oxytocin (bonding hormone) to feel safe.',
        remedy: 'Hug a pet, schedule time with loved ones, or tell your partner you need closeness.',
        selfcare: 'Use a weighted blanket, wear soft fabrics, or treat yourself to a massage.',
        partner: [
            'Initiate physical contact (hold hands, cuddle, stroke her hair, long hugs).',
            'Say "I love you" and show warmth through small, thoughtful gestures.',
            'Prioritize intimacy and emotional closeness.'
        ]
    },
    'Need for reassurance': {
        category: 'emotional',
        why: 'Vulnerability and self-doubt spike before the cycle, requiring social validation.',
        remedy: 'Ask directly: "I am feeling insecure today, can you tell me I am doing okay?"',
        selfcare: 'Read positive comments, reviews, or past letters to remind yourself of your worth.',
        partner: [
            'Verbally reassure her: "You are doing great," "I love you," "We are fine."',
            'Answer her questions patiently without sounding annoyed or defensive.',
            'Remind her that this phase will pass and you are by her side.'
        ]
    },

    // 3. Mental & Cognitive Symptoms
    'Brain fog': {
        category: 'mental',
        why: 'Hormonal drops affect glucose metabolism in the brain, slowing cognitive speed.',
        remedy: 'Write down everything. Avoid complex, multi-layered planning tasks.',
        selfcare: 'Take a screen break every 30 minutes. Focus on simple, linear tasks.',
        partner: [
            'Help her remember details (appointments, lists) without being patronizing.',
            'Keep conversations simple; avoid overload of options.'
        ]
    },
    'Poor concentration': {
        category: 'mental',
        why: 'Low estrogen levels reduce focus capacity and attention span.',
        remedy: 'Use the Pomodoro Technique: work for 20 minutes, rest for 5 minutes.',
        selfcare: 'Declutter your desk. Eliminate background noise (use white noise if needed).',
        partner: [
            'Avoid interrupting her when she is working or trying to focus.',
            'Help set a quiet environment at home.'
        ]
    },
    'Forgetfulness': {
        category: 'mental',
        why: 'Hormonal fluctuations affect short-term memory processing.',
        remedy: 'Set alarms and reminders on your phone. Write notes on sticky papers.',
        selfcare: 'Slow down; double-check locks, keys, and appliances before leaving.',
        partner: [
            'Gently remind her of commitments instead of pointing out her lapses.',
            'Write down plans on a shared family calendar.'
        ]
    },
    'Difficulty making decisions': {
        category: 'mental',
        why: 'Estrogen drops affect prefrontal cortex activity, making risk assessment stressful.',
        remedy: 'Postpone major decisions. Flip a coin for trivial choices (like dinner).',
        selfcare: 'Limit options; choose between just 2 paths instead of scanning all options.',
        partner: [
            'Make simple choices for her: "I will pick dinner tonight," "Let\'s watch this show."',
            'Do not ask open-ended questions like "What do you want to do?"'
        ]
    },
    'Overthinking': {
        category: 'mental',
        why: 'Anxiety surges during the luteal phase prompt the brain to analyze threats continuously.',
        remedy: 'Write your thoughts on paper to get them out of your head. Do a grounding exercise.',
        selfcare: 'Focus on your five senses: name 5 things you see, 4 you feel, 3 you hear, 2 you smell, 1 you taste.',
        partner: [
            'Answer doubts patiently. Reassure her: "Everything is okay, we are secure."',
            'Help distract her with a fun, engaging conversation.'
        ]
    },
    'Anxiety': {
        category: 'mental',
        why: 'Reduced progesterone levels decrease GABA (calming chemical) receptors activity in the brain.',
        remedy: 'Avoid caffeine immediately. Do slow breathing (exhale longer than inhale).',
        selfcare: 'Incorporate weighted blankets, warm baths, and lavender oils into your routine.',
        partner: [
            'Keep your presence calm and grounded. Hold her hand and breathe with her.',
            'Validate her fears without debating: "I know you feel anxious, I am right here."'
        ]
    },
    'Racing thoughts': {
        category: 'mental',
        why: 'Stress hormones increase in response to progesterone drop, accelerating thought loops.',
        remedy: 'Do a "brain dump": write continuously on paper for 5 minutes without editing.',
        selfcare: 'Listen to a guided meditation or brown noise to block mental chatter.',
        partner: [
            'Suggest a calming walk in nature together.',
            'Avoid presenting complex problems or debating options.'
        ]
    },
    'Reduced productivity': {
        category: 'mental',
        why: 'Physical discomfort and low focus reduce daily task performance.',
        remedy: 'Accept that productivity is cyclical. Do only the critical 20% of tasks today.',
        selfcare: 'Release guilt about not doing enough. Celebrate small accomplishments.',
        partner: [
            'Reassure her that it is okay to rest and not be productive every day.',
            'Pitch in with errands.'
        ]
    },
    'Mental fatigue': {
        category: 'mental',
        why: 'Coping with physical cramps and mood shifts causes cognitive burnout.',
        remedy: 'Switch off analytical tasks. Listen to instrumental music.',
        selfcare: 'Take a digital detox. Sit quietly without scrolling.',
        partner: [
            'Handle cognitive decisions for the household today (planning meals, schedules).',
            'Let her rest without asking questions.'
        ]
    },
    'Reduced motivation': {
        category: 'mental',
        why: 'Dopamine receptors are less active when estrogen levels are low.',
        remedy: 'Break tasks into tiny steps. Reward yourself for completing any step.',
        selfcare: 'Be kind to yourself. Lower your standards for the next few days.',
        partner: [
            'Offer gentle encouragement without pushing or demanding.',
            'Accompany her in starting tasks.'
        ]
    },

    // 4. Behavioral Changes
    'Silent behavior': {
        category: 'behavioral',
        why: 'Energy depletion and emotional self-protection leads to low social stamina.',
        remedy: 'Acknowledge your need for silence. Communicate boundaries calmly to others.',
        selfcare: 'Rest in a quiet space, read, or listen to calming music.',
        partner: [
            'Respect her space and desire for quiet without taking it personally.',
            'Check in gently ("I am here if you want to talk, otherwise take your time").',
            'Avoid repeated questioning; send a supportive message without expecting a reply.'
        ]
    },
    'Social withdrawal': {
        category: 'behavioral',
        why: 'Low serotonin levels and low energy diminish the desire to interact with others.',
        remedy: 'Declining social events during this phase is okay. Keep interactions light.',
        selfcare: 'Plan a cozy night in alone or with a trusted, low-energy contact.',
        partner: [
            'Do not press her to attend parties or social gatherings.',
            'Keep her company in silence, or support her staying home.',
            'Reassure her that withdrawing to recharge is normal.'
        ]
    },
    'Reduced communication': {
        category: 'behavioral',
        why: 'Language and conversation processing feel exhausting due to low cognitive energy.',
        remedy: 'Send short, informative messages: "Feeling low energy today, will text more tomorrow."',
        selfcare: 'Avoid text debates. Limit phone time.',
        partner: [
            'Accept brief or late texts without feeling neglected.',
            'Do not demand long explanations or intense talks.',
            'Use text to send supportive notes instead of calls.'
        ]
    },
    'Increased argument tendency': {
        category: 'behavioral',
        why: 'High irritability and low patience make differences of opinion feel like conflicts.',
        remedy: 'Adopt a "24-hour rule" before raising disagreements. Take a break when heated.',
        selfcare: 'Journal the source of your argument to identify if it is hormonal irritation.',
        partner: [
            'Do not take the bait. Respond with calmness: "Let\'s talk about this tomorrow."',
            'Avoid defensive responses; hug her or step back to diffuse the tension.',
            'Focus on resolving comfort, not winning the argument.'
        ]
    },
    'Avoiding people': {
        category: 'behavioral',
        why: 'Low tolerance for noise, questions, and expectations triggers a desire for isolation.',
        remedy: 'Set your status to "Do Not Disturb". Choose quiet work spaces.',
        selfcare: 'Spend time in nature alone. Enjoy a solo walk or coffee.',
        partner: [
            'Create a private sanctuary for her at home where she won\'t be disturbed.',
            'Keep visitors away; manage household guests yourself.',
            'Give her complete space.'
        ]
    },
    'Staying in bed more': {
        category: 'behavioral',
        why: 'Estrogen and progesterone drop drains physical energy, increasing the need for rest.',
        remedy: 'Allow yourself extra sleep. Avoid forcing productivity when exhausted.',
        selfcare: 'Make your bed a cozy sanctuary with clean sheets and pillows.',
        partner: [
            'Bring her tea, water, or breakfast in bed.',
            'Ensure the bedroom remains quiet and dark so she can sleep.',
            'Validate her need for extra rest.'
        ]
    },
    'Increased phone usage': {
        category: 'behavioral',
        why: 'Low dopamine levels lead to mindless scrolling for quick dopamine hits.',
        remedy: 'Set app timers. Replace scrolling with reading a book or listening to podcasts.',
        selfcare: 'Put your phone in another room during rest periods.',
        partner: [
            'Gently invite her to screen-free activities (a walk, a board game).',
            'Avoid commenting critically about her phone usage.'
        ]
    },
    'Emotional shutdown': {
        category: 'behavioral',
        why: 'An emotional defense mechanism to cope with intense mood shifts and fatigue.',
        remedy: 'Accept this numbness as temporary. Do not force emotional responses.',
        selfcare: 'Engage in grounding tactile activities (cooking, gardening, sketching).',
        partner: [
            'Be present without demanding emotional expression or feedback.',
            'Offer simple physical presence (sitting together, holding hands).',
            'Avoid criticizing her for being "cold" or "distant."'
        ]
    },
    'Reduced interest in hobbies': {
        category: 'behavioral',
        why: 'Low estrogen levels decrease the brain\'s reward sensitivity, causing temporary anhedonia.',
        remedy: 'Allow yourself to skip activities. Rest is a productive choice.',
        selfcare: 'Do simple, low-energy versions of hobbies (e.g. watch a hobby video instead of doing it).',
        partner: [
            'Reassure her that her passions will return after this phase.',
            'Suggest relaxing, passive activities you can share (listening to an audiobook).'
        ]
    },

    // 5. Relationship & Social Dynamics
    'Need for space': {
        category: 'relationship',
        why: 'Sensory overload and fatigue increase the desire to be alone to self-regulate.',
        remedy: 'Communicate boundaries clearly: "I love you, but I need 1 hour of quiet space today."',
        selfcare: 'Retreat to a private room. Take a solo walk or drive.',
        partner: [
            'Grant her space immediately and happily, without making her feel guilty.',
            'Reassure her: "Take all the time you need, I am here when you are ready."',
            'Manage household tasks so she can truly relax in her space.'
        ]
    },
    'Need for comfort': {
        category: 'relationship',
        why: 'Physical discomfort and emotional vulnerability prompt the brain to seek comfort.',
        remedy: 'Ask for comforting actions: "Can we watch a movie?" "Can I get a hug?"',
        selfcare: 'Wear softest clothes, wrap in blankets, eat warm, comforting food.',
        partner: [
            'Initiate physical comfort (cuddling, back rubs, holding hands).',
            'Bring her a hot water bottle, wrap her in a blanket, or make tea.',
            'Listen to her worries with full empathy.'
        ]
    },
    'Need for attention': {
        category: 'relationship',
        why: 'Insecurity and loneliness surges require social connection to feel safe.',
        remedy: 'Express your feelings: "I am feeling a bit lonely, let\'s spend time together."',
        selfcare: 'Reach out to a close friend or partner for quality time.',
        partner: [
            'Put away screens and focus entirely on her during conversations.',
            'Bring her a small surprise (flower, favorite treat) to show you are thinking of her.',
            'Plan a special, relaxing activity together.'
        ]
    },
    'Relationship conflicts': {
        category: 'relationship',
        why: 'Lowered emotional filters can cause bottled-up irritations to explode.',
        remedy: 'Delay major discussions until after your period. Use "I feel" statements.',
        selfcare: 'Take a break from discussions. Breathe and cool down.',
        partner: [
            'Do not get defensive. Focus on de-escalation: "Let\'s talk about this calmly tomorrow."',
            'Reassure her of your commitment despite the disagreement.',
            'Focus on comforting her first.'
        ]
    },
    'Increased sensitivity during conversations': {
        category: 'relationship',
        why: 'Estrogen drops cause the brain to interpret neutral comments as critical or negative.',
        remedy: 'Before reacting, ask yourself: "Is it possible they didn\'t mean it critically?"',
        selfcare: 'Ask for clarification gently: "Did you mean that as a criticism? I am feeling sensitive."',
        partner: [
            'Avoid harsh tones, criticism, or dry jokes.',
            'Speak with extra clarity and warmth to prevent misunderstandings.',
            'Respond to sensitive reactions with immediate reassurance.'
        ]
    },
    'Feeling misunderstood': {
        category: 'relationship',
        why: 'Difficulty communicating emotional states combined with low empathy from others.',
        remedy: 'Write down what you want to communicate before speaking.',
        selfcare: 'Read other women\'s PMS experiences online to feel validated.',
        partner: [
            'Avoid telling her she is "exaggerating" or "irrational."',
            'Say: "I want to understand. Tell me what it feels like right now."',
            'Show that you hear her.'
        ]
    },
    'Feeling emotionally distant': {
        category: 'relationship',
        why: 'Emotional exhaustion leads to temporary numbness to conserve energy.',
        remedy: 'Do not panic about the relationship. This distance is a normal hormonal phase.',
        selfcare: 'Focus on self-care; do not force emotional closeness.',
        partner: [
            'Stay close physically (sitting together) without demanding conversation.',
            'Send a sweet, low-pressure message to keep the connection alive.',
            'Be patient; the closeness will return.'
        ]
    }
};

// Phase Metadata for Premium Phase Identities & Partner Support
const PHASE_METADATA = {
    'MENSTRUAL': {
        badge: 'Menstrual Phase',
        title: 'Rest & Calming Reflection',
        quote: 'A quiet time for deep rest, physical recovery, and gentle reflection. Tune inward.',
        explanation: 'She is in the Menstrual Phase. Her energy levels are naturally lower as her body recovers. Support her by keeping tasks light and creating a calm environment.',
        illustration: 'illustration-menstrual'
    },
    'FOLLICULAR': {
        badge: 'Follicular Phase',
        title: 'Growth & Fresh Beginnings',
        quote: 'Feel your physical energy and mental focus rising. A perfect time for planning and fresh projects.',
        explanation: 'She is in the Follicular Phase. Estrogen is rising, which naturally increases physical energy, verbal fluency, and motivation. She is in a growing, upbeat space.',
        illustration: 'illustration-follicular'
    },
    'OVULATION': {
        badge: 'Ovulation Phase',
        title: 'Radiance & Social Vitality',
        quote: 'You are radiant and magnetic. Enjoy peak confidence, communication skills, and social vitality.',
        explanation: 'She is in the Ovulation Phase. Estrogen and testosterone peak here, fostering maximum confidence, sociability, and communication power. A wonderful time to connect.',
        illustration: 'illustration-ovulation'
    },
    'LUTEAL': {
        badge: 'Luteal Phase',
        title: 'Introspection & Self-Care',
        quote: 'Energy turns inward. Practice gentle boundaries, self-nurturing, and honor your sensitivity.',
        explanation: 'She is in the Luteal Phase. Progesterone dominates. In the late stage, dropping hormones can lower stress tolerance and heighten emotional sensitivity.',
        illustration: 'illustration-luteal'
    }
};

const PHASE_PARTNER_TIPS = {
    'MENSTRUAL': [
        'Help keep her physical workload low. Take over chores like cooking or cleaning without being asked.',
        'Provide warm comforts: make a hot beverage, prepare a heating pad, or offer a cozy space to rest.',
        'Listen patiently if she wants to talk, but respect her need for quiet rest and reflection.'
    ],
    'FOLLICULAR': [
        'She is entering a high-energy phase. Be open to trying new activities or planning outings together.',
        'Support her motivation and projects. She is likely feeling positive, clear-headed, and active.',
        'A great time for deep, engaging conversations and tackling tasks together.'
    ],
    'OVULATION': [
        'Her social energy is at its peak. Join her in social events, get-togethers, or date nights.',
        'Match her upbeat mood with positivity and active connection. Reassure her of your support.',
        'She is highly communicative; check in and have collaborative, open discussions.'
    ],
    'LUTEAL': [
        'Practice extra patience. Recognize that irritability or mood shifts are hormonal responses to dropping progesterone.',
        'Help reduce sensory overload: support a calm evening environment, cook a comforting meal.',
        'Respect her boundaries if she needs quiet space, and check in gently without pressure.'
    ]
};

// Document Elements
document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

// Initialize the Application
async function initApp() {
    try { setupTheme(); } catch (e) { console.error('setupTheme failed:', e); }
    try { setupTabNavigation(); } catch (e) { console.error('setupTabNavigation failed:', e); }
    try { setupEventListeners(); } catch (e) { console.error('setupEventListeners failed:', e); }
    try { setupSliders(); } catch (e) { console.error('setupSliders failed:', e); }
    
    try {
        // Set default date inputs to today
        const todayStr = getLocalDateString(new Date());
        const logDate = document.getElementById('log-date');
        if (logDate) logDate.value = todayStr;
        const periodStart = document.getElementById('period-start');
        if (periodStart) periodStart.value = todayStr;
        const periodEnd = document.getElementById('period-end');
        if (periodEnd) periodEnd.value = '';
    } catch (e) {
        console.error('setting date defaults failed:', e);
    }

    try {
        if (checkUrlParams()) return;
        // Check Authentication
        await checkAuth();
    } catch (e) {
        console.error('checkAuth failed:', e);
    }
}

// Check Authentication Status on Startup
async function checkAuth() {
    try {
        const user = await fetchAPI('/auth/check');
        state.user = user;
        showMainApp(user);
    } catch (err) {
        showLoginOverlay();
    }
}

// Show login panel overlay
function showLoginOverlay() {
    document.getElementById('auth-overlay').style.display = 'flex';
    document.getElementById('app-container').style.display = 'none';
}

// Show main application
function showMainApp(user) {
    document.getElementById('auth-overlay').style.display = 'none';
    document.getElementById('app-container').style.display = 'flex';
    
    // Restore Partner Mode Toggle
    const partnerMode = safeStorage.getItem('partnerModeEnabled') === 'true';
    document.getElementById('partner-mode-toggle').checked = partnerMode;
    document.getElementById('partner-insight-card').style.display = partnerMode ? 'block' : 'none';
    
    updateUserUI(user);
    refreshAllData();
}

// Setup Theme Toggle
function setupTheme() {
    const themeToggle = document.getElementById('theme-toggle');
    const themeIcon = document.getElementById('theme-icon');
    
    const savedTheme = safeStorage.getItem('theme') || 'dark';
    if (savedTheme === 'light') {
        document.body.classList.remove('dark-mode');
        document.body.classList.add('light-mode');
        themeIcon.className = 'fa-solid fa-moon';
    } else {
        document.body.classList.add('dark-mode');
        document.body.classList.remove('light-mode');
        themeIcon.className = 'fa-solid fa-sun';
    }

    themeToggle.addEventListener('click', () => {
        if (document.body.classList.contains('dark-mode')) {
            document.body.classList.remove('dark-mode');
            document.body.classList.add('light-mode');
            themeIcon.className = 'fa-solid fa-moon';
            safeStorage.setItem('theme', 'light');
        } else {
            document.body.classList.add('dark-mode');
            document.body.classList.remove('light-mode');
            themeIcon.className = 'fa-solid fa-sun';
            safeStorage.setItem('theme', 'dark');
        }
        if (state.dailyLogs.length > 0) {
            renderCharts();
        }
    });
}

// Setup Tab Navigation
function setupTabNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const tabContents = document.querySelectorAll('.tab-content');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const targetTab = item.getAttribute('data-tab');
            
            navItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');

            tabContents.forEach(tab => {
                if (tab.id === targetTab) {
                    tab.classList.add('active');
                } else {
                    tab.classList.remove('active');
                }
            });

            if (targetTab === 'calendar-view') {
                renderCalendar();
            } else if (targetTab === 'analytics') {
                renderCharts();
            }
        });
    });
}

// Setup Sliders event listeners to update text labels
function setupSliders() {
    const sliders = ['stress', 'workload', 'energy'];
    sliders.forEach(s => {
        const slider = document.getElementById(`life-${s}`);
        const display = document.getElementById(`val-${s}`);
        slider.addEventListener('input', () => {
            display.innerText = slider.value;
        });
    });
}

// Setup Event Listeners
function setupEventListeners() {
    // Auth Toggles
    document.getElementById('toggle-to-register').addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('login-form').style.display = 'none';
        document.getElementById('forgot-form').style.display = 'none';
        document.getElementById('register-form').style.display = 'block';
        document.getElementById('auth-subtitle').innerText = 'Create your holistic profile';
    });

    document.getElementById('toggle-to-login').addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('register-form').style.display = 'none';
        document.getElementById('forgot-form').style.display = 'none';
        document.getElementById('login-form').style.display = 'block';
        document.getElementById('auth-subtitle').innerText = 'Sign in to your health companion';
    });

    document.getElementById('toggle-to-forgot').addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('login-form').style.display = 'none';
        document.getElementById('register-form').style.display = 'none';
        document.getElementById('forgot-form').style.display = 'block';
        document.getElementById('forgot-error').innerText = '';
        document.getElementById('forgot-success').innerText = '';
        document.getElementById('auth-subtitle').innerText = 'Reset your secure password';
    });

    document.getElementById('toggle-forgot-to-login').addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('forgot-form').style.display = 'none';
        document.getElementById('register-form').style.display = 'none';
        document.getElementById('login-form').style.display = 'block';
        document.getElementById('auth-subtitle').innerText = 'Sign in to your health companion';
    });

    // Login Form Submit
    document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const usernameVal = document.getElementById('login-username').value.trim();
        const passwordVal = document.getElementById('login-password').value;
        const errorDiv = document.getElementById('login-error');
        errorDiv.innerText = '';

        if (!usernameVal || !passwordVal) {
            errorDiv.innerText = 'Please enter your email and password.';
            return;
        }

        const submitBtn = e.target.querySelector('button[type="submit"]');
        const originalBtnText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin mr-5"></i> Signing In...';

        try {
            const user = await fetchAPI('/auth/login', {
                method: 'POST',
                body: { username: usernameVal, password: passwordVal }
            });
            state.user = user;
            showMainApp(user);
            showNotificationToast('Logged in successfully! Welcome back.');
        } catch (err) {
            errorDiv.innerText = err.message || 'Invalid username or password.';
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnText;
        }
    });

    // Register Form Submit
    document.getElementById('register-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const nameVal = document.getElementById('reg-name').value.trim();
        const usernameVal = document.getElementById('reg-username').value.trim();
        const passwordVal = document.getElementById('reg-password').value;
        const errorDiv = document.getElementById('register-error');
        errorDiv.innerText = '';

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(usernameVal)) {
            errorDiv.innerText = 'Please enter a valid email address.';
            return;
        }

        if (passwordVal.length < 6) {
            errorDiv.innerText = 'Password must be at least 6 characters.';
            return;
        }

        const submitBtn = e.target.querySelector('button[type="submit"]');
        const originalBtnText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin mr-5"></i> Creating Account...';

        try {
            const user = await fetchAPI('/auth/register', {
                method: 'POST',
                body: { username: usernameVal, password: passwordVal, name: nameVal }
            });
            state.user = user;
            showMainApp(user);
            showNotificationToast('Account created successfully! Welcome.');
        } catch (err) {
            errorDiv.innerText = err.message || 'Error creating account. Please try again.';
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnText;
        }
    });

    // Forgot Password Form Submit
    document.getElementById('forgot-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const usernameVal = document.getElementById('forgot-username').value.trim();
        const errorDiv = document.getElementById('forgot-error');
        const successDiv = document.getElementById('forgot-success');
        errorDiv.innerText = '';
        successDiv.innerText = '';

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(usernameVal)) {
            errorDiv.innerText = 'Please enter a valid email address.';
            return;
        }

        const submitBtn = e.target.querySelector('button[type="submit"]');
        const originalBtnText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin mr-5"></i> Sending Link...';

        try {
            const res = await fetchAPI('/auth/forgot-password', {
                method: 'POST',
                body: { username: usernameVal }
            });
            successDiv.innerHTML = `
                Password reset link sent (simulated)!<br>
                Check backend logs, or click below to reset:<br>
                <a href="#" id="simulated-reset-trigger" class="mt-10 d-inline-block text-accent" style="color: var(--input-focus); text-decoration: underline; font-weight: 600; display: inline-block; margin-top: 10px;">
                    Reset Password Link
                </a>
            `;
            const trigger = document.getElementById('simulated-reset-trigger');
            if (trigger) {
                trigger.addEventListener('click', (e) => {
                    e.preventDefault();
                    showResetPasswordView(res.resetToken);
                });
            }
            document.getElementById('forgot-username').value = '';
        } catch (err) {
            errorDiv.innerText = err.message || 'Error resetting password. Please check your email.';
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnText;
        }
    });

    // Logout Button
    const logoutBtn = document.getElementById('logout-btn');
    logoutBtn.addEventListener('click', async () => {
        if (confirm('Are you sure you want to sign out?')) {
            try {
                await fetchAPI('/auth/logout', { method: 'POST' });
                state.user = null;
                state.predictions = null;
                state.periods = [];
                state.dailyLogs = [];
                showNotificationToast('Signed out successfully.');
                showLoginOverlay();
            } catch (err) {
                console.error(err);
                // force login overlay
                showLoginOverlay();
            }
        }
    });

    // Quick Log Form (Today)
    const quickLogForm = document.getElementById('quick-log-form');
    quickLogForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const moodVal = document.querySelector('input[name="quick-mood"]:checked')?.value || '😐';
        const notesVal = document.getElementById('quick-notes').value;
        const symptomsChecked = Array.from(document.querySelectorAll('input[name="quick-symptoms"]:checked')).map(cb => cb.value);
        
        const todayStr = getLocalDateString(new Date());
        const logDTO = {
            date: todayStr,
            mood: moodVal,
            notes: notesVal,
            symptoms: symptomsChecked
        };

        try {
            await saveDailyLog(logDTO);
            showNotificationToast('Daily log saved! 🌸');
            quickLogForm.reset();
            document.querySelector('input[name="quick-mood"][value="😐"]').checked = true;
            await refreshAllData();
        } catch (err) {
            console.error(err);
            showNotificationToast('Error saving log: ' + err.message, true);
        }
    });

    // Detailed Log Form
    const detailedForm = document.getElementById('detailed-log-form');
    detailedForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const dateVal = document.getElementById('log-date').value;
        const moodVal = document.querySelector('input[name="detail-mood"]:checked')?.value || '😐';
        const notesVal = document.getElementById('detail-notes').value;
        const symptomsChecked = Array.from(document.querySelectorAll('input[name="detail-symptoms"]:checked')).map(cb => cb.value);
        
        // Lifestyle data mapping
        const sleepDur = parseFloat(document.getElementById('life-sleep-duration').value) || null;
        const sleepQual = document.getElementById('life-sleep-quality').value || null;
        const water = parseFloat(document.getElementById('life-water').value) || null;
        const exercise = parseInt(document.getElementById('life-exercise').value) || null;
        const steps = parseInt(document.getElementById('life-steps').value) || null;
        const diet = document.getElementById('life-diet').value || null;
        const caffeine = parseInt(document.getElementById('life-caffeine').value) || null;
        const alcohol = parseInt(document.getElementById('life-alcohol').value) || null;
        
        const stress = parseInt(document.getElementById('life-stress').value);
        const workload = parseInt(document.getElementById('life-workload').value);
        const energy = parseInt(document.getElementById('life-energy').value);

        const logDTO = {
            date: dateVal,
            mood: moodVal,
            notes: notesVal,
            symptoms: symptomsChecked,
            sleepDuration: sleepDur,
            sleepQuality: sleepQual,
            waterIntake: water,
            exerciseDuration: exercise,
            walkingSteps: steps,
            dietQuality: diet,
            caffeineIntake: caffeine,
            alcoholIntake: alcohol,
            stressLevel: stress,
            workload: workload,
            energyLevel: energy
        };

        try {
            await saveDailyLog(logDTO);
            showNotificationToast('Holistic daily tracker saved! 🌟');
            await refreshAllData();
        } catch (err) {
            console.error(err);
            showNotificationToast('Error saving daily logger: ' + err.message, true);
        }
    });

    // Auto load log for selected date
    const logDateInput = document.getElementById('log-date');
    logDateInput.addEventListener('change', async () => {
        await loadDailyEntryForDate(logDateInput.value);
    });

    // Period Cycle Form
    const periodForm = document.getElementById('period-log-form');
    periodForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const startVal = document.getElementById('period-start').value;
        const endVal = document.getElementById('period-end').value || null;

        if (endVal && new Date(startVal) > new Date(endVal)) {
            showNotificationToast('Start date cannot be after end date.', true);
            return;
        }

        try {
            await logPeriod({ startDate: startVal, endDate: endVal });
            showNotificationToast('Menstrual cycle logged successfully! 🔴');
            periodForm.reset();
            const todayStr = getLocalDateString(new Date());
            document.getElementById('period-start').value = todayStr;
            document.getElementById('period-end').value = '';
            await refreshAllData();
        } catch (err) {
            console.error(err);
            showNotificationToast('Error logging cycle: ' + err.message, true);
        }
    });

    // Settings Update Form
    const settingsForm = document.getElementById('settings-form');
    settingsForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const nameVal = document.getElementById('settings-name').value;
        const cycleLenVal = parseInt(document.getElementById('settings-cycle-length').value);
        const periodDurVal = parseInt(document.getElementById('settings-period-duration').value);

        try {
            await updateUserSettings({
                name: nameVal,
                defaultCycleLength: cycleLenVal,
                defaultPeriodDuration: periodDurVal
            });
            showNotificationToast('Preferences saved! ⚙️');
            await refreshAllData();
        } catch (err) {
            console.error(err);
            showNotificationToast('Error saving user preferences.', true);
        }
    });

    // Calendar month control buttons
    document.getElementById('prev-month-btn').addEventListener('click', () => {
        state.currentCalendarDate.setMonth(state.currentCalendarDate.getMonth() - 1);
        renderCalendar();
    });

    document.getElementById('next-month-btn').addEventListener('click', () => {
        state.currentCalendarDate.setMonth(state.currentCalendarDate.getMonth() + 1);
        renderCalendar();
    });

    // Notifications toggle dropdown
    const notifBtn = document.getElementById('notification-btn');
    const notifDropdown = document.getElementById('notifications-dropdown');
    notifBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        notifDropdown.classList.toggle('active');
    });

    document.addEventListener('click', () => {
        notifDropdown.classList.remove('active');
    });

    notifDropdown.addEventListener('click', (e) => {
        e.stopPropagation();
    });

    document.getElementById('clear-notifs').addEventListener('click', () => {
        document.getElementById('notif-list').innerHTML = '<div class="notif-empty">No alerts today</div>';
        document.getElementById('notification-badge').style.display = 'none';
        showNotificationToast('Notifications dismissed.');
    });

    // Close Remedies Drawer
    document.getElementById('close-remedy-drawer').addEventListener('click', closeRemedyDrawer);
    document.getElementById('remedy-drawer-overlay').addEventListener('click', closeRemedyDrawer);

    // End Period Modal handlers
    document.getElementById('close-end-modal').addEventListener('click', closeEndPeriodModal);
    
    document.getElementById('end-period-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('end-period-id').value;
        const startStr = document.getElementById('end-period-start-display').value;
        const endVal = document.getElementById('end-period-date').value;
        const errorDiv = document.getElementById('end-period-error');
        errorDiv.innerText = '';

        if (new Date(startStr) > new Date(endVal)) {
            errorDiv.innerText = 'End date cannot be before start date.';
            return;
        }

        const submitBtn = e.target.querySelector('button[type="submit"]');
        const originalBtnText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin mr-5"></i> Saving...';

        try {
            await fetchAPI(`/periods/${id}`, {
                method: 'PUT',
                body: { startDate: startStr, endDate: endVal }
            });
            showNotificationToast('Period cycle ended and saved! 🌸');
            closeEndPeriodModal();
            await refreshAllData();
        } catch (err) {
            console.error(err);
            errorDiv.innerText = 'Error ending period: ' + err.message;
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnText;
        }
    });

    // Setup real-time checkbox tag clicks in the logger form
    // When a checkbox in detailed form is checked, let them click the tag text to open remedy drawer!
    document.querySelectorAll('input[name="detail-symptoms"]').forEach(cb => {
        cb.addEventListener('change', () => {
            if (cb.checked) {
                openRemedyDrawer(cb.value);
            }
        });
    });

    // Partner Mode is initialized and managed by initPartnerMode()
}

// Refresh all cache states from Backend API
async function refreshAllData() {
    try {
        const user = await fetchAPI('/users/current');
        state.user = user;
        updateUserUI(user);

        const periods = await fetchAPI('/periods');
        state.periods = periods;
        renderPeriodsTable(periods);

        const logs = await fetchAPI('/daily-logs');
        state.dailyLogs = logs;

        const predictions = await fetchAPI('/predictions');
        state.predictions = predictions;
        updateDashboardUI(predictions);

        // Load log details for date
        await loadDailyEntryForDate(document.getElementById('log-date').value);

        // Alerts calculations
        calculateNotifications(predictions);

        // Update active tabs
        if (document.getElementById('calendar-view').classList.contains('active')) {
            renderCalendar();
        }
        if (document.getElementById('analytics').classList.contains('active')) {
            renderCharts();
        }

    } catch (err) {
        console.error('Error fetching data: ', err);
        if (err.message.includes('401')) {
            showLoginOverlay();
        }
    }
}

// API helper utility
async function fetchAPI(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    
    options.credentials = 'include';
    
    if (options.body && typeof options.body === 'object') {
        options.body = JSON.stringify(options.body);
        options.headers = {
            ...options.headers,
            'Content-Type': 'application/json'
        };
    }

    const response = await fetch(url, options);
    
    // Intercept 401 and redirect to login overlay
    if (response.status === 401 && !endpoint.includes('/auth/check') && !endpoint.includes('/auth/login')) {
        showLoginOverlay();
        throw new Error('Unauthorized session');
    }

    if (!response.ok) {
        let errMsg = `API error ${response.status}: ${response.statusText}`;
        try {
            const errData = await response.json();
            if (errData && errData.message) {
                errMsg = errData.message;
            }
        } catch (e) {
            try {
                const text = await response.text();
                if (text) errMsg = text;
            } catch (e2) {}
        }
        throw new Error(errMsg);
    }

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
        return await response.json();
    }
    return await response.text();
}

// User Settings Update
async function updateUserSettings(userDTO) {
    state.user = await fetchAPI('/users/current', {
        method: 'PUT',
        body: userDTO
    });
}

// Save Daily log
async function saveDailyLog(logDTO) {
    return await fetchAPI('/daily-logs', {
        method: 'POST',
        body: logDTO
    });
}

// Save Period cycle
async function logPeriod(periodDTO) {
    return await fetchAPI('/periods', {
        method: 'POST',
        body: periodDTO
    });
}

// Delete period cycle
async function deletePeriodCycle(id) {
    await fetchAPI(`/periods/${id}`, {
        method: 'DELETE'
    });
}

// Load daily entry for details form
async function loadDailyEntryForDate(dateStr) {
    try {
        const log = await fetchAPI(`/daily-logs/date/${dateStr}`);
        
        // Reset check inputs
        document.querySelectorAll('input[name="detail-mood"]').forEach(input => input.checked = false);
        document.querySelectorAll('input[name="detail-symptoms"]').forEach(input => input.checked = false);
        document.getElementById('detail-notes').value = '';
        
        // Reset lifestyle inputs
        document.getElementById('life-sleep-duration').value = '';
        document.getElementById('life-sleep-quality').value = '';
        document.getElementById('life-water').value = '';
        document.getElementById('life-exercise').value = '';
        document.getElementById('life-steps').value = '';
        document.getElementById('life-diet').value = '';
        document.getElementById('life-caffeine').value = '';
        document.getElementById('life-alcohol').value = '';
        
        document.getElementById('life-stress').value = 3;
        document.getElementById('val-stress').innerText = 3;
        document.getElementById('life-workload').value = 3;
        document.getElementById('val-workload').innerText = 3;
        document.getElementById('life-energy').value = 3;
        document.getElementById('val-energy').innerText = 3;

        if (log) {
            const moodVal = log.mood || '😐';
            const moodInput = document.querySelector(`input[name="detail-mood"][value="${moodVal}"]`);
            if (moodInput) moodInput.checked = true;

            if (log.symptoms) {
                log.symptoms.forEach(s => {
                    const cb = document.querySelector(`input[name="detail-symptoms"][value="${s}"]`);
                    if (cb) cb.checked = true;
                });
            }

            document.getElementById('detail-notes').value = log.notes || '';
            
            // Set lifestyle inputs
            if (log.sleepDuration !== undefined) document.getElementById('life-sleep-duration').value = log.sleepDuration;
            if (log.sleepQuality !== undefined) document.getElementById('life-sleep-quality').value = log.sleepQuality || '';
            if (log.waterIntake !== undefined) document.getElementById('life-water').value = log.waterIntake;
            if (log.exerciseDuration !== undefined) document.getElementById('life-exercise').value = log.exerciseDuration;
            if (log.walkingSteps !== undefined) document.getElementById('life-steps').value = log.walkingSteps;
            if (log.dietQuality !== undefined) document.getElementById('life-diet').value = log.dietQuality || '';
            if (log.caffeineIntake !== undefined) document.getElementById('life-caffeine').value = log.caffeineIntake;
            if (log.alcoholIntake !== undefined) document.getElementById('life-alcohol').value = log.alcoholIntake;
            
            if (log.stressLevel !== undefined && log.stressLevel !== null) {
                document.getElementById('life-stress').value = log.stressLevel;
                document.getElementById('val-stress').innerText = log.stressLevel;
            }
            if (log.workload !== undefined && log.workload !== null) {
                document.getElementById('life-workload').value = log.workload;
                document.getElementById('val-workload').innerText = log.workload;
            }
            if (log.energyLevel !== undefined && log.energyLevel !== null) {
                document.getElementById('life-energy').value = log.energyLevel;
                document.getElementById('val-energy').innerText = log.energyLevel;
            }
        } else {
            document.querySelector('input[name="detail-mood"][value="😐"]').checked = true;
        }
    } catch (err) {
        console.error(err);
    }
}

// Update settings forms inputs on load
function updateUserUI(user) {
    document.getElementById('welcome-title').innerText = `Hello, ${user.name}`;
    document.getElementById('profile-summary-name').innerText = user.name;
    document.getElementById('settings-name').value = user.name;
    document.getElementById('settings-cycle-length').value = user.defaultCycleLength;
    document.getElementById('settings-period-duration').value = user.defaultPeriodDuration;
}

// Populate periods tables
function renderPeriodsTable(periods) {
    const tbody = document.getElementById('cycles-table-body');
    if (periods.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted)">No cycles logged yet. Start tracking above!</td></tr>`;
        return;
    }

    tbody.innerHTML = '';
    periods.forEach(p => {
        const start = new Date(p.startDate);
        let endDateDisplay = '--';
        let durationDisplay = 'Ongoing';
        let statusBadge = '';
        let actionButtons = '';

        if (p.endDate) {
            const end = new Date(p.endDate);
            const duration = Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1;
            endDateDisplay = formatDisplayDate(p.endDate);
            durationDisplay = `<strong>${duration} days</strong>`;
            statusBadge = `<span class="badge-completed">Completed</span>`;
            actionButtons = `
                <button class="delete-btn" data-id="${p.id}" title="Delete this entry">
                    <i class="fa-solid fa-trash-can"></i>
                </button>
            `;
        } else {
            endDateDisplay = 'Active';
            durationDisplay = 'Ongoing';
            statusBadge = `<span class="badge-active"><span class="pulse-dot"></span> Active</span>`;
            actionButtons = `
                <button class="table-action-btn end-period-btn" data-id="${p.id}" data-start="${p.startDate}" title="End Period">
                    <i class="fa-solid fa-calendar-check mr-5"></i> End Period
                </button>
                <button class="delete-btn" data-id="${p.id}" title="Delete this entry" style="margin-left: 8px;">
                    <i class="fa-solid fa-trash-can"></i>
                </button>
            `;
        }

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${formatDisplayDate(p.startDate)}</td>
            <td>${endDateDisplay}</td>
            <td>${durationDisplay}</td>
            <td>${statusBadge}</td>
            <td>${actionButtons}</td>
        `;
        
        const deleteBtn = tr.querySelector('.delete-btn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', async (e) => {
                if (confirm('Are you sure you want to delete this period cycle entry?')) {
                    const id = e.currentTarget.getAttribute('data-id');
                    await deletePeriodCycle(id);
                    showNotificationToast('Period cycle deleted.');
                    await refreshAllData();
                }
            });
        }

        const endBtn = tr.querySelector('.end-period-btn');
        if (endBtn) {
            endBtn.addEventListener('click', (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                const startStr = e.currentTarget.getAttribute('data-start');
                openEndPeriodModal(id, startStr);
            });
        }

        tbody.appendChild(tr);
    });
}

// Update dashboard forecast panel
function updateDashboardUI(calc) {
    const cycleVal = document.getElementById('cycle-day-value');
    const remainingVal = document.getElementById('days-remaining-value');
    const dot = document.getElementById('status-dot');
    const text = document.getElementById('status-text');

    // Render AI Patterns list
    renderAIPatterns(calc.aiPatterns);

    if (calc.pmsStatus === 'NO_DATA' || !calc.currentPhase || calc.currentPhase === 'NO_DATA') {
        cycleVal.innerText = '--';
        remainingVal.innerText = 'No cycle data';
        dot.innerText = '⚪';
        text.innerText = 'Log a period to begin';
        
        document.getElementById('forecast-period').innerText = 'Awaiting entries';
        document.getElementById('forecast-pms').innerText = 'Awaiting entries';
        document.getElementById('forecast-fertile').innerText = 'Awaiting entries';
        document.getElementById('forecast-ovulation').innerText = 'Awaiting entries';
        
        document.getElementById('avg-cycle-len-val').innerText = calc.avgCycleLength;
        document.getElementById('avg-period-dur-val').innerText = calc.avgPeriodDuration;
        
        // Default visuals
        document.getElementById('dashboard').className = 'tab-content active';
        document.getElementById('phase-badge').innerText = 'Awaiting Data';
        document.getElementById('phase-title').innerText = 'Holistic Insights';
        document.getElementById('phase-quote').innerText = 'Log your period cycle start date to initialize your journey.';
        document.querySelectorAll('.phase-illustration').forEach(el => el.style.display = 'none');
        document.getElementById('partner-insight-card').style.display = 'none';
        return;
    }

    const activePhase = calc.currentPhase;
    const metadata = PHASE_METADATA[activePhase];

    // Trigger complete visual phase transition
    document.getElementById('dashboard').className = `tab-content active phase-${activePhase.toLowerCase()}`;

    // Update Phase Identity Card
    document.getElementById('phase-badge').innerText = metadata.badge;
    document.getElementById('phase-title').innerText = metadata.title;
    document.getElementById('phase-quote').innerText = `"${metadata.quote}"`;

    // Toggle Phase SVGs
    document.querySelectorAll('.phase-illustration').forEach(el => el.style.display = 'none');
    const activeIllustration = document.getElementById(metadata.illustration);
    if (activeIllustration) {
        activeIllustration.style.display = 'block';
    }

    // Set Circle progress values
    cycleVal.innerText = calc.currentCycleDay;
    remainingVal.innerText = `${calc.daysRemaining} days remaining`;
    
    // Cycle Circle animation percentage
    const circle = document.getElementById('progress-circle');
    const radius = circle.r.baseVal.value;
    const circumference = radius * 2 * Math.PI;
    circle.style.strokeDasharray = `${circumference} ${circumference}`;

    let percent = (calc.currentCycleDay / calc.avgCycleLength) * 100;
    if (percent > 100) percent = 100; // Overdue
    const offset = circumference - (percent / 100) * circumference;
    circle.style.strokeDashoffset = offset;

    // Set colors of circle based on status
    if (calc.pmsStatus === 'PERIOD_ONGOING') {
        dot.innerText = '🔴';
        text.innerText = 'Period Ongoing';
    } else if (calc.pmsStatus === 'PERIOD_EXPECTED_SOON') {
        dot.innerText = '🔴';
        text.innerText = 'Period Expected Soon';
    } else if (calc.pmsStatus === 'PMS_LIKELY') {
        dot.innerText = '🟡';
        text.innerText = 'PMS Window Active';
    } else {
        dot.innerText = '🟢';
        text.innerText = 'Normal / Low Risk';
    }

    // Set averages stats boxes
    document.getElementById('avg-cycle-len-val').innerText = calc.avgCycleLength;
    document.getElementById('avg-period-dur-val').innerText = calc.avgPeriodDuration;

    // Set forecasts info fields
    document.getElementById('forecast-period').innerText = formatDisplayDateRange(calc.nextPeriodStartDate, calc.nextPeriodEndDate);
    document.getElementById('forecast-pms').innerText = formatDisplayDateRange(calc.pmsStartDate, calc.pmsEndDate);
    document.getElementById('forecast-fertile').innerText = formatDisplayDateRange(calc.fertileStartDate, calc.fertileEndDate);
    document.getElementById('forecast-ovulation').innerText = formatDisplayDate(calc.ovulationDate);

    // ------------------ Update Horizontal Cycle Progress Timeline ------------------
    const pDur = calc.avgPeriodDuration || 5;
    const cLen = calc.avgCycleLength || 28;
    const ovDay = Math.max(pDur + 2, cLen - 14);

    // Set segment ranges dynamically based on average lengths
    document.querySelector('#phase-seg-menstrual .phase-days').innerText = `Days 1-${pDur}`;
    document.querySelector('#phase-seg-follicular .phase-days').innerText = `Days ${pDur + 1}-${ovDay - 2}`;
    document.querySelector('#phase-seg-ovulation .phase-days').innerText = `Days ${ovDay - 1}-${ovDay + 1}`;
    document.querySelector('#phase-seg-luteal .phase-days').innerText = `Days ${ovDay + 2}-${cLen}`;

    // Update segment widths dynamically
    document.getElementById('phase-seg-menstrual').style.width = `${(pDur / cLen) * 100}%`;
    document.getElementById('phase-seg-follicular').style.width = `${((ovDay - 2 - pDur) / cLen) * 100}%`;
    document.getElementById('phase-seg-ovulation').style.width = `${(3 / cLen) * 100}%`;
    document.getElementById('phase-seg-luteal').style.width = `${((cLen - (ovDay + 1)) / cLen) * 100}%`;

    // Position timeline indicator dot
    const indicator = document.getElementById('timeline-indicator');
    const indicatorText = document.getElementById('timeline-indicator-text');
    let progressPercent = ((calc.currentCycleDay - 1) / (cLen - 1)) * 100;
    if (progressPercent < 0) progressPercent = 0;
    if (progressPercent > 100) progressPercent = 100;
    indicator.style.left = `${progressPercent}%`;
    indicator.style.borderColor = `var(--phase-accent)`;
    indicatorText.style.backgroundColor = `var(--phase-accent)`;
    indicatorText.innerText = `Day ${calc.currentCycleDay}`;

    // Highlight the active timeline segment
    document.querySelectorAll('.timeline-phase').forEach(seg => {
        const pName = seg.getAttribute('data-phase');
        if (pName === activePhase) {
            seg.classList.add('active-timeline-seg');
            seg.classList.remove('dimmed');
        } else {
            seg.classList.remove('active-timeline-seg');
            seg.classList.add('dimmed');
        }
    });

    // ------------------ Update Partner Insight Mode Card ------------------
    const partnerToggle = document.getElementById('partner-mode-toggle');
    const partnerCard = document.getElementById('partner-insight-card');

    if (partnerToggle.checked) {
        partnerCard.style.display = 'block';
        document.getElementById('partner-phase-name').innerText = metadata.badge;
        document.getElementById('partner-phase-explanation').innerText = metadata.explanation;

        // Render centerpiece animated character
        const todayStr = getLocalDateString(new Date());
        const todayLog = state.dailyLogs.find(l => l.date === todayStr);
        const avatarState = getAvatarState(calc, todayLog);
        const avatarContainer = document.getElementById('user-dashboard-avatar-container');
        if (avatarContainer) {
            avatarContainer.innerHTML = getAnimatedAvatarSVG(avatarState);
        }

        // Extract today's logged symptoms to add dynamic partner advice
        const activeSymptoms = todayLog ? todayLog.symptoms : [];

        let strategies = [...PHASE_PARTNER_TIPS[activePhase]];
        let customCommunication = "";

        activeSymptoms.forEach(s => {
            const symData = SYMPTOM_DIRECTORY[s];
            if (symData && symData.partner) {
                strategies = strategies.concat(symData.partner);
            }
            // Tailor communication cues based on logged symptoms
            if (s === 'Need for reassurance') {
                customCommunication = `"I want you to know how much I love and appreciate you. You are completely safe with me, and we are in this together."`;
            } else if (s === 'Need for space') {
                customCommunication = `"I can see you need some quiet space to recharge. I'll head out for a bit to let you rest, but text me if you want me to bring anything back."`;
            } else if (s === 'Cramps' || s === 'Pelvic pain' || s === 'Lower back pain') {
                customCommunication = `"I'm sorry you're hurting. I've warmed up the heating pad, and I'll keep your water filled. Let me handle everything else."`;
            }
        });

        // Render dynamic partner support strategies
        const strategiesContainer = document.getElementById('partner-strategies-list');
        strategiesContainer.innerHTML = strategies.map(strat => `<li>${strat}</li>`).join('');

        // Render communication cue
        const commBox = document.getElementById('partner-communication-box');
        if (customCommunication) {
            commBox.innerText = customCommunication;
        } else {
            const phaseDefaultCues = {
                'MENSTRUAL': `"How can I make you more comfortable today? I'll handle all the house chores and dinner."`,
                'FOLLICULAR': `"You have great energy today! Is there any project or outing you want to tackle together?"`,
                'OVULATION': `"You look beautiful. Let's do something fun or schedule a date night."`,
                'LUTEAL': `"I understand your energy is turning inward. I'm here for comfort, or I can give you space if that's what you need."`
            };
            commBox.innerText = phaseDefaultCues[activePhase] || `"How can I support you best today?"`;
        }
    } else {
        partnerCard.style.display = 'none';
    }
}

// Render dynamic AI Insights pattern list on the dashboard
function renderAIPatterns(patterns) {
    const list = document.getElementById('ai-patterns-list');
    list.innerHTML = '';
    
    if (!patterns || patterns.length === 0) {
        list.innerHTML = `<div class="pattern-item loading">No patterns detected yet. Feed details daily to initialize.</div>`;
        return;
    }

    patterns.forEach(p => {
        const div = document.createElement('div');
        div.className = 'pattern-item';
        // Add icons based on keywords
        let icon = '<i class="fa-solid fa-circle-info mr-5" style="color: var(--input-focus)"></i>';
        if (p.includes('Sleep') || p.includes('sleep')) {
            icon = '<i class="fa-solid fa-bed mr-5" style="color: var(--pms-color)"></i>';
        } else if (p.includes('Anger') || p.includes('Silent')) {
            icon = '<i class="fa-solid fa-masks-theater mr-5" style="color: var(--period-color)"></i>';
        } else if (p.includes('Crying') || p.includes('luteal')) {
            icon = '<i class="fa-solid fa-heart mr-5" style="color: var(--fertile-color)"></i>';
        }
        
        div.innerHTML = `${icon} <span>${p}</span>`;
        list.appendChild(div);
    });
}

// Calculate and list active notifications dropdown contents
function calculateNotifications(calc) {
    const list = document.getElementById('notif-list');
    const badge = document.getElementById('notification-badge');

    if (calc.pmsStatus === 'NO_DATA') {
        list.innerHTML = '<div class="notif-empty">No cycle data. Alerts will trigger when period is logged.</div>';
        badge.style.display = 'none';
        return;
    }

    const notifications = [];
    const today = new Date();
    today.setHours(0,0,0,0);

    const nextPeriod = new Date(calc.nextPeriodStartDate);
    const pmsStart = new Date(calc.pmsStartDate);
    const pmsEnd = new Date(calc.pmsEndDate);
    const ovulation = new Date(calc.ovulationDate);
    const fertileStart = new Date(calc.fertileStartDate);
    const fertileEnd = new Date(calc.fertileEndDate);

    const diffPeriod = Math.round((nextPeriod - today) / (1000 * 60 * 60 * 24));
    const diffPMS = Math.round((pmsStart - today) / (1000 * 60 * 60 * 24));

    if (calc.pmsStatus === 'PERIOD_ONGOING') {
        notifications.push({
            type: 'period',
            text: 'Your period is currently ongoing. Remember to rest and hydrate! 🔴'
        });
    } else if (diffPeriod === 0) {
        notifications.push({
            type: 'period',
            text: 'Your period is expected today! 🔴'
        });
    } else if (diffPeriod === 1) {
        notifications.push({
            type: 'period',
            text: 'Your period is expected tomorrow. Prepare trackers! 🔴'
        });
    } else if (diffPeriod < 0) {
        notifications.push({
            type: 'period',
            text: `Your period is overdue by ${Math.abs(diffPeriod)} days. Consider updating your cycle properties. 🔴`
        });
    }

    if (today >= pmsStart && today <= pmsEnd) {
        notifications.push({
            type: 'pms',
            text: 'You are currently inside the predicted PMS window. Be kind to yourself. 🟡'
        });
    } else if (diffPMS === 2) {
        notifications.push({
            type: 'pms',
            text: 'PMS window expected to start in 2 days. 🟡'
        });
    } else if (diffPMS === 1) {
        notifications.push({
            type: 'pms',
            text: 'PMS window expected to start tomorrow. 🟡'
        });
    }

    if (today >= fertileStart && today <= fertileEnd) {
        const diffOvu = Math.round((ovulation - today) / (1000 * 60 * 60 * 24));
        if (diffOvu === 0) {
            notifications.push({
                type: 'fertile',
                text: 'Today is estimated as your Ovulation Day! 🟢⭐'
            });
        } else {
            notifications.push({
                type: 'fertile',
                text: `Fertile window active. Ovulation in ${diffOvu} days. 🟢`
            });
        }
    }

    // Daily trackers reminder check
    const todayStr = getLocalDateString(today);
    const hasTodayLog = state.dailyLogs.some(l => l.date === todayStr);
    if (!hasTodayLog) {
        notifications.push({
            type: 'fertile',
            text: 'Don\'t forget to log today\'s symptoms, mood, and sleep! 📝'
        });
    }

    // Render list
    if (notifications.length === 0) {
        list.innerHTML = '<div class="notif-empty">All caught up! No alerts today.</div>';
        badge.style.display = 'none';
        return;
    }

    list.innerHTML = '';
    notifications.forEach(n => {
        const div = document.createElement('div');
        div.className = `notif-item ${n.type}`;
        div.innerText = n.text;
        list.appendChild(div);
    });

    badge.innerText = notifications.length;
    badge.style.display = 'block';
}

// ------------------ Calendar Rendering Logic ------------------
function renderCalendar() {
    const date = state.currentCalendarDate;
    const year = date.getFullYear();
    const month = date.getMonth();

    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    document.getElementById('calendar-month-year').innerText = `${monthNames[month]} ${year}`;

    const firstDayIndex = new Date(year, month, 1).getDay();
    const lastDay = new Date(year, month + 1, 0).getDate();
    
    const grid = document.getElementById('calendar-days-grid');
    grid.innerHTML = '';

    for (let i = 0; i < firstDayIndex; i++) {
        const emptyDiv = document.createElement('div');
        emptyDiv.className = 'calendar-day empty';
        grid.appendChild(emptyDiv);
    }

    for (let day = 1; day <= lastDay; day++) {
        const dayDate = new Date(year, month, day);
        const dayStr = getLocalDateString(dayDate);

        const dayDiv = document.createElement('div');
        dayDiv.className = 'calendar-day';
        dayDiv.setAttribute('data-date', dayStr);

        const numSpan = document.createElement('span');
        numSpan.className = 'day-num';
        numSpan.innerText = day;
        dayDiv.appendChild(numSpan);

        const indicatorsDiv = document.createElement('div');
        indicatorsDiv.className = 'day-indicators';
        dayDiv.appendChild(indicatorsDiv);

        highlightCalendarDay(dayDiv, dayDate, indicatorsDiv);

        dayDiv.addEventListener('click', () => {
            document.querySelectorAll('.calendar-day').forEach(d => d.classList.remove('selected'));
            dayDiv.classList.add('selected');
            showDayDetails(dayDate, dayStr);
        });

        grid.appendChild(dayDiv);
    }

    const todayStr = getLocalDateString(new Date());
    const todayCell = grid.querySelector(`.calendar-day[data-date="${todayStr}"]`);
    if (todayCell) {
        todayCell.click();
    } else {
        const firstCell = grid.querySelector('.calendar-day:not(.empty)');
        if (firstCell) firstCell.click();
    }
}

function highlightCalendarDay(element, date, indicatorsContainer) {
    const dateStr = getLocalDateString(date);
    const todayStr = getLocalDateString(new Date());

    if (dateStr === todayStr) {
        element.classList.add('today');
    }

    // 1. Logged period highlights
    let isPeriodDay = false;
    for (let p of state.periods) {
        const start = new Date(p.startDate);
        start.setHours(0,0,0,0);
        let isMatch = false;
        
        if (p.endDate) {
            const end = new Date(p.endDate);
            end.setHours(0,0,0,0);
            isMatch = (date >= start && date <= end);
        } else {
            const today = new Date();
            today.setHours(0,0,0,0);
            isMatch = (date >= start && date <= today);
        }
        
        if (isMatch) {
            element.classList.add('period-day');
            isPeriodDay = true;
            break;
        }
    }

    // 2. Logged daily indicators
    const log = state.dailyLogs.find(l => l.date === dateStr);
    if (log) {
        if (log.mood) {
            const moodColor = MOOD_COLORS[log.mood] || 'var(--text-muted)';
            const moodIndicator = document.createElement('span');
            moodIndicator.className = 'day-indicator';
            moodIndicator.style.backgroundColor = moodColor;
            moodIndicator.style.width = '6px';
            moodIndicator.style.height = '6px';
            moodIndicator.style.borderRadius = '50%';
            moodIndicator.title = `Mood: ${log.mood}`;
            indicatorsContainer.appendChild(moodIndicator);
        }
    }

    // 3. Predicted highlights
    if (!isPeriodDay && state.predictions) {
        const nextPeriodStart = new Date(state.predictions.nextPeriodStartDate);
        const nextPeriodEnd = new Date(state.predictions.nextPeriodEndDate);
        const pmsStart = new Date(state.predictions.pmsStartDate);
        const pmsEnd = new Date(state.predictions.pmsEndDate);
        const fertileStart = new Date(state.predictions.fertileStartDate);
        const fertileEnd = new Date(state.predictions.fertileEndDate);
        const ovulation = new Date(state.predictions.ovulationDate);

        nextPeriodStart.setHours(0,0,0,0);
        nextPeriodEnd.setHours(0,0,0,0);
        pmsStart.setHours(0,0,0,0);
        pmsEnd.setHours(0,0,0,0);
        fertileStart.setHours(0,0,0,0);
        fertileEnd.setHours(0,0,0,0);
        ovulation.setHours(0,0,0,0);

        if (date >= nextPeriodStart && date <= nextPeriodEnd) {
            element.classList.add('period-predicted');
        } else if (dateStr === getLocalDateString(ovulation)) {
            element.classList.add('ovulation-day');
        } else if (date >= pmsStart && date <= pmsEnd) {
            element.classList.add('pms-day');
        } else if (date >= fertileStart && date <= fertileEnd) {
            element.classList.add('fertile-day');
        }
    }
}

function showDayDetails(date, dateStr) {
    document.getElementById('selected-day-title').innerText = formatDisplayDate(dateStr);
    const container = document.getElementById('day-details-content');

    const log = state.dailyLogs.find(l => l.date === dateStr);
    
    let cycleInfo = '';
    const matchedLoggedPeriod = state.periods.find(p => {
        const s = new Date(p.startDate);
        const e = new Date(p.endDate);
        s.setHours(0,0,0,0);
        e.setHours(0,0,0,0);
        return date >= s && date <= e;
    });

    if (matchedLoggedPeriod) {
        cycleInfo = `<div class="details-row"><i class="fa-solid fa-droplet period-color"></i><div class="details-content"><h5>Cycle Status</h5><p>Logged Period Day 🔴</p></div></div>`;
    } else if (state.predictions) {
        const nextPeriodStart = new Date(state.predictions.nextPeriodStartDate);
        const nextPeriodEnd = new Date(state.predictions.nextPeriodEndDate);
        const pmsStart = new Date(state.predictions.pmsStartDate);
        const pmsEnd = new Date(state.predictions.pmsEndDate);
        const fertileStart = new Date(state.predictions.fertileStartDate);
        const fertileEnd = new Date(state.predictions.fertileEndDate);
        const ovulation = new Date(state.predictions.ovulationDate);

        nextPeriodStart.setHours(0,0,0,0);
        nextPeriodEnd.setHours(0,0,0,0);
        pmsStart.setHours(0,0,0,0);
        pmsEnd.setHours(0,0,0,0);
        fertileStart.setHours(0,0,0,0);
        fertileEnd.setHours(0,0,0,0);
        ovulation.setHours(0,0,0,0);

        if (date >= nextPeriodStart && date <= nextPeriodEnd) {
            cycleInfo = `<div class="details-row"><i class="fa-solid fa-droplet" style="color: var(--period-pred-color)"></i><div class="details-content"><h5>Forecast Status</h5><p>Predicted Period Day</p></div></div>`;
        } else if (dateStr === getLocalDateString(ovulation)) {
            cycleInfo = `<div class="details-row"><i class="fa-solid fa-star ovulation-color"></i><div class="details-content"><h5>Forecast Status</h5><p>Estimated Ovulation Day ⭐</p></div></div>`;
        } else if (date >= pmsStart && date <= pmsEnd) {
            cycleInfo = `<div class="details-row"><i class="fa-solid fa-sparkles pms-color"></i><div class="details-content"><h5>Forecast Status</h5><p>Likely PMS Window 🟡</p></div></div>`;
        } else if (date >= fertileStart && date <= fertileEnd) {
            cycleInfo = `<div class="details-row"><i class="fa-solid fa-seedling fertile-color"></i><div class="details-content"><h5>Forecast Status</h5><p>Active Fertile Window 🟢</p></div></div>`;
        }
    }

    if (!log && !cycleInfo) {
        container.innerHTML = `
            <p class="empty-state">No logs recorded for this day.</p>
            <div style="text-align: center; margin-top: 15px;">
                <button class="secondary-btn btn-sm" id="calendar-quick-log-btn"><i class="fa-solid fa-plus mr-10"></i>Add Entry</button>
            </div>
        `;
        
        document.getElementById('calendar-quick-log-btn').addEventListener('click', () => {
            document.getElementById('log-date').value = dateStr;
            loadDailyEntryForDate(dateStr);
            document.querySelector('[data-tab="log-entry"]').click();
        });
        return;
    }

    let moodHTML = '';
    if (log && log.mood) {
        moodHTML = `
            <div class="details-row">
                <i class="fa-solid fa-face-smile"></i>
                <div class="details-content">
                    <h5>Mood</h5>
                    <p style="font-size: 18px;">${log.mood}</p>
                </div>
            </div>
        `;
    }

    let symptomsHTML = '';
    if (log && log.symptoms && log.symptoms.length > 0) {
        const tags = log.symptoms.map(s => `<span class="detail-symptom-tag" onclick="openRemedyDrawer('${s}')">${s}</span>`).join('');
        symptomsHTML = `
            <div class="details-row">
                <i class="fa-solid fa-heart-pulse"></i>
                <div class="details-content">
                    <h5>Logged Symptoms</h5>
                    <div style="margin-top: 5px;">${tags}</div>
                </div>
            </div>
        `;
    }

    let lifestyleHTML = '';
    if (log && (log.sleepDuration || log.waterIntake || log.walkingSteps || log.stressLevel || log.energyLevel)) {
        lifestyleHTML = `
            <div class="details-row">
                <i class="fa-solid fa-person-running"></i>
                <div class="details-content">
                    <h5>Lifestyle & Habits</h5>
                    <div class="lifestyle-compact-display" style="font-size: 13px; color: var(--text-secondary); line-height: 1.6;">
                        ${log.sleepDuration ? `<div>💤 Sleep: <strong>${log.sleepDuration}h</strong> (${log.sleepQuality || 'Good'})</div>` : ''}
                        ${log.waterIntake ? `<div>💧 Water: <strong>${log.waterIntake}L</strong></div>` : ''}
                        ${log.walkingSteps ? `<div>👣 Steps: <strong>${log.walkingSteps}</strong></div>` : ''}
                        ${log.stressLevel ? `<div>🔥 Stress: <strong>${log.stressLevel}/5</strong> | ⚡ Energy: <strong>${log.energyLevel}/5</strong></div>` : ''}
                    </div>
                </div>
            </div>
        `;
    }

    let notesHTML = '';
    if (log && log.notes) {
        notesHTML = `
            <div class="details-row">
                <i class="fa-solid fa-note-sticky"></i>
                <div class="details-content flex-1">
                    <h5>Notes</h5>
                    <p class="notes-block">"${log.notes}"</p>
                </div>
            </div>
        `;
    }

    container.innerHTML = `
        <div class="details-grid">
            ${cycleInfo}
            ${moodHTML}
            ${symptomsHTML}
            ${lifestyleHTML}
            ${notesHTML}
        </div>
        <div style="margin-top: 25px; text-align: center;">
            <button class="secondary-btn w-100" id="calendar-edit-entry-btn">
                <i class="fa-solid fa-pen-to-square mr-10"></i>Edit Log Entry
            </button>
        </div>
    `;

    document.getElementById('calendar-edit-entry-btn').addEventListener('click', () => {
        document.getElementById('log-date').value = dateStr;
        loadDailyEntryForDate(dateStr);
        document.querySelector('[data-tab="log-entry"]').click();
    });
}

// ------------------ Remedy Drawer Controllers ------------------
// ------------------ Authentication UI Integration ------------------

// Initialize authentication handlers
function initAuth() {
    // Toggle overlay links
    const toggleToRegister = document.getElementById('toggle-to-register');
    const toggleToLogin = document.getElementById('toggle-to-login');
    const toggleToForgot = document.getElementById('toggle-to-forgot');
    const toggleForgotToLogin = document.getElementById('toggle-forgot-to-login');

    toggleToRegister?.addEventListener('click', (e) => { e.preventDefault(); toggleAuthOverlay('register'); });
    toggleToLogin?.addEventListener('click', (e) => { e.preventDefault(); toggleAuthOverlay('login'); });
    toggleToForgot?.addEventListener('click', (e) => { e.preventDefault(); toggleAuthOverlay('forgot'); });
    toggleForgotToLogin?.addEventListener('click', (e) => { e.preventDefault(); toggleAuthOverlay('login'); });
    document.getElementById('toggle-reset-to-login')?.addEventListener('click', (e) => { e.preventDefault(); toggleAuthOverlay('login'); });

    // Reset password form submission
    document.getElementById('reset-password-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const newPassword = document.getElementById('reset-new-password').value;
        const confirmPassword = document.getElementById('reset-confirm-password').value;
        const errorDiv = document.getElementById('reset-error');
        const successDiv = document.getElementById('reset-success');
        
        errorDiv.innerText = '';
        successDiv.innerText = '';
        
        if (newPassword.length < 6) {
            errorDiv.innerText = 'Password must be at least 6 characters.';
            return;
        }
        if (newPassword !== confirmPassword) {
            errorDiv.innerText = 'Passwords do not match.';
            return;
        }
        
        try {
            await fetchAPI('/auth/reset-password', {
                method: 'POST',
                body: { token: activeResetToken, newPassword }
            });
            successDiv.innerText = 'Password updated successfully! Redirecting to sign in...';
            setTimeout(() => {
                toggleAuthOverlay('login');
                // Clean up URL query param if present
                if (window.location.search.includes('resetToken')) {
                    window.history.replaceState({}, document.title, window.location.pathname);
                }
            }, 2000);
        } catch (err) {
            errorDiv.innerText = err.message || 'Error updating password. Link may be expired.';
        }
    });

    // Form submissions
    document.getElementById('login-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('login-username').value.trim();
        const password = document.getElementById('login-password').value;
        try {
            const res = await fetch(`${API_BASE}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Login failed');
            safeStorage.setItem('user', JSON.stringify(data));
            state.user = data;
            showDashboard();
            showNotificationToast('Logged in successfully');
        } catch (err) {
            document.getElementById('login-error').innerText = err.message;
            showNotificationToast(err.message, true);
        }
    });

    document.getElementById('register-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('reg-username').value.trim();
        const password = document.getElementById('reg-password').value;
        const name = document.getElementById('reg-name').value.trim();
        try {
            const res = await fetch(`${API_BASE}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password, name })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Registration failed');
            safeStorage.setItem('user', JSON.stringify(data));
            state.user = data;
            showDashboard();
            showNotificationToast('Account created and logged in');
        } catch (err) {
            document.getElementById('register-error').innerText = err.message;
            showNotificationToast(err.message, true);
        }
    });

    document.getElementById('forgot-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('forgot-username').value.trim();
        try {
            const res = await fetch(`${API_BASE}/auth/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Request failed');
            showNotificationToast('Password reset link sent (simulated)');
        } catch (err) {
            document.getElementById('forgot-error').innerText = err.message;
            showNotificationToast(err.message, true);
        }
    });

    // Logout handling
    document.getElementById('logout-btn')?.addEventListener('click', async () => {
        try { await fetch(`${API_BASE}/auth/logout`, { method: 'POST' }); } catch (_) {}
        safeStorage.setItem('user', '');
        state.user = null;
        toggleAuthOverlay('login');
        showNotificationToast('Logged out');
    });

    // Auto-login if session exists
    const stored = safeStorage.getItem('user');
    if (stored) {
        try {
            const user = JSON.parse(stored);
            if (user && user.id) {
                state.user = user;
                showDashboard();
            }
        } catch (_) {}
    }
}

// Show or hide authentication overlay sections
function toggleAuthOverlay(section) {
    const overlay = document.getElementById('auth-overlay');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const forgotForm = document.getElementById('forgot-form');
    const resetForm = document.getElementById('reset-password-form');
    if (!overlay) return;
    overlay.style.display = 'flex';
    loginForm.style.display = 'none';
    registerForm.style.display = 'none';
    forgotForm.style.display = 'none';
    if (resetForm) resetForm.style.display = 'none';
    if (section === 'login') {
        loginForm.style.display = 'block';
        document.getElementById('auth-subtitle').innerText = 'Sign in to your health companion';
    } else if (section === 'register') {
        registerForm.style.display = 'block';
        document.getElementById('auth-subtitle').innerText = 'Create your holistic profile';
    } else if (section === 'forgot') {
        forgotForm.style.display = 'block';
        document.getElementById('auth-subtitle').innerText = 'Reset your secure password';
    } else if (section === 'reset') {
        if (resetForm) resetForm.style.display = 'block';
        document.getElementById('auth-subtitle').innerText = 'Enter your new password';
    }
}

// Shows the reset password form directly
function showResetPasswordView(token) {
    activeResetToken = token;
    toggleAuthOverlay('reset');
    document.getElementById('reset-new-password').value = '';
    document.getElementById('reset-confirm-password').value = '';
    document.getElementById('reset-error').innerText = '';
    document.getElementById('reset-success').innerText = '';
}

// Show main dashboard after successful authentication
function showDashboard() {
    document.getElementById('auth-overlay').style.display = 'none';
    document.getElementById('app-container').style.display = 'block';
    document.getElementById('partner-dashboard-view').style.display = 'none';
    const nameEl = document.getElementById('profile-summary-name');
    if (nameEl && state.user && state.user.name) nameEl.innerText = state.user.name;
}

// Initialize Partner Mode UI
// Initialize Partner Mode UI
async function initPartnerMode() {
    const toggle = document.getElementById('partner-mode-toggle');
    const card = document.getElementById('partner-insight-card');
    
    // Fetch configuration from database on initialization
    try {
        const config = await fetchAPI('/partner/config');
        if (config && config.enabled) {
            state.partnerConfig = config;
            if (toggle) toggle.checked = true;
            if (card) card.style.display = 'block';
        } else {
            state.partnerConfig = null;
            if (toggle) toggle.checked = false;
            if (card) card.style.display = 'none';
        }
    } catch (err) {
        state.partnerConfig = null;
        if (toggle) toggle.checked = false;
        if (card) card.style.display = 'none';
    }

    if (toggle) {
        // Intercept click to show modal
        toggle.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopImmediatePropagation();
            showPartnerSetupModal();
        });
    }

    // Modal elements event listeners
    const modal = document.getElementById('partner-setup-modal');
    const closeBtn = document.getElementById('close-partner-modal');
    const form = document.getElementById('partner-setup-form');
    const emailInput = document.getElementById('partner-email-input');
    const statusBox = document.getElementById('partner-status-box');
    const statusLoader = document.getElementById('partner-status-loader');
    const statusResult = document.getElementById('partner-status-result');
    const dashboardBox = document.getElementById('partner-dashboard-box');
    const dashboardUrl = document.getElementById('partner-dashboard-url');
    const copyBtn = document.getElementById('copy-dashboard-btn');
    const submitBtn = document.getElementById('partner-submit-btn');
    const disconnectBtn = document.getElementById('partner-disconnect-btn');

    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            modal.style.display = 'none';
        });
    }

    if (copyBtn) {
        copyBtn.addEventListener('click', () => {
            dashboardUrl.select();
            navigator.clipboard.writeText(dashboardUrl.value)
                .then(() => showNotificationToast('Link copied to clipboard! 📋'))
                .catch(err => console.error('Failed to copy: ', err));
        });
    }

    const openBtn = document.getElementById('open-dashboard-btn');
    if (openBtn) {
        openBtn.addEventListener('click', () => {
            if (state.partnerConfig && state.partnerConfig.dashboardToken) {
                modal.style.display = 'none';
                document.getElementById('app-container').style.display = 'none';
                document.getElementById('partner-dashboard-view').style.display = 'block';
                document.getElementById('partner-back-btn').style.display = 'flex';
                initPartnerDashboardView(state.partnerConfig.dashboardToken);
            }
        });
    }

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = emailInput.value.trim();
            if (!email) return;

            // Show loading
            submitBtn.disabled = true;
            statusBox.style.display = 'block';
            statusLoader.style.display = 'block';
            statusResult.innerHTML = '';
            statusResult.style.display = 'none';
            dashboardBox.style.display = 'none';
            disconnectBtn.style.display = 'none';

            try {
                const res = await fetch(API_BASE + '/partner/config', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ partnerEmail: email })
                });

                if (res.ok) {
                    const savedConfig = await res.json();
                    state.partnerConfig = savedConfig;
                    
                    // Show success
                    statusLoader.style.display = 'none';
                    statusResult.innerHTML = '<span style="color: #2bcbba; font-weight: bold;">✓ Test Email Sent</span>';
                    statusResult.style.display = 'block';
                    
                    const dbLink = window.location.origin + "/partner/dashboard/" + savedConfig.dashboardToken;
                    dashboardUrl.value = dbLink;
                    dashboardBox.style.display = 'block';
                    disconnectBtn.style.display = 'block';
                    submitBtn.innerText = 'Update Email';

                    // Update main UI state
                    if (toggle) toggle.checked = true;
                    if (card) card.style.display = 'block';
                    showNotificationToast('Partner connected successfully! 👥');
                    if (state.predictions) {
                        updateDashboardUI(state.predictions);
                    }
                } else {
                    const errMsg = await res.text();
                    statusLoader.style.display = 'none';
                    statusResult.innerHTML = `<span style="color: #ff7676; font-weight: bold;">${errMsg}</span>`;
                    statusResult.style.display = 'block';
                }
            } catch (err) {
                statusLoader.style.display = 'none';
                statusResult.innerHTML = '<span style="color: #ff7676; font-weight: bold;">❌ SMTP Configuration Error</span>';
                statusResult.style.display = 'block';
            } finally {
                submitBtn.disabled = false;
            }
        });
    }

    if (disconnectBtn) {
        disconnectBtn.addEventListener('click', async () => {
            if (!state.partnerConfig) return;
            disconnectBtn.disabled = true;
            try {
                await fetchAPI(`/partner/config/${state.partnerConfig.id}`, {
                    method: 'DELETE'
                });
                state.partnerConfig = null;
                emailInput.value = '';
                emailInput.disabled = false;
                statusBox.style.display = 'none';
                dashboardBox.style.display = 'none';
                disconnectBtn.style.display = 'none';
                submitBtn.innerText = 'Save & Connect Partner';

                if (toggle) toggle.checked = false;
                if (card) card.style.display = 'none';
                showNotificationToast('Partner disconnected.');
                modal.style.display = 'none';
            } catch (err) {
                console.error(err);
                showNotificationToast('Error disconnecting partner.');
            } finally {
                disconnectBtn.disabled = false;
            }
        });
    }
}

function showPartnerSetupModal() {
    const modal = document.getElementById('partner-setup-modal');
    if (!modal) return;

    const emailInput = document.getElementById('partner-email-input');
    const statusBox = document.getElementById('partner-status-box');
    const statusLoader = document.getElementById('partner-status-loader');
    const statusResult = document.getElementById('partner-status-result');
    const dashboardBox = document.getElementById('partner-dashboard-box');
    const dashboardUrl = document.getElementById('partner-dashboard-url');
    const submitBtn = document.getElementById('partner-submit-btn');
    const disconnectBtn = document.getElementById('partner-disconnect-btn');

    statusLoader.style.display = 'none';
    
    if (state.partnerConfig) {
        emailInput.value = state.partnerConfig.partnerEmail;
        statusBox.style.display = 'block';
        statusResult.innerHTML = '<span style="color: #2bcbba; font-weight: bold;">✓ Connected & Test Email Sent</span>';
        statusResult.style.display = 'block';
        
        const dbLink = window.location.origin + "/partner/dashboard/" + state.partnerConfig.dashboardToken;
        dashboardUrl.value = dbLink;
        dashboardBox.style.display = 'block';
        disconnectBtn.style.display = 'block';
        submitBtn.innerText = 'Update Email';
    } else {
        emailInput.value = '';
        statusBox.style.display = 'none';
        dashboardBox.style.display = 'none';
        disconnectBtn.style.display = 'none';
        submitBtn.innerText = 'Save & Connect Partner';
    }

    modal.style.display = 'flex';
}

// Initialize UI components after DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    initAuth();
    initPartnerMode();
});

function openRemedyDrawer(symptomName) {
    const data = SYMPTOM_DIRECTORY[symptomName];
    if (!data) return; // Ignore if symptom has no recommendations

    const overlay = document.getElementById('remedy-drawer-overlay');
    const drawer = document.getElementById('remedy-drawer');
    const badge = document.getElementById('remedy-badge');

    // Populate data
    document.getElementById('remedy-symptom-name').innerText = symptomName;
    document.getElementById('remedy-why').innerText = data.why || 'Hormonal adjustments.';
    
    // Reset badge classes and content
    badge.innerText = data.category;
    badge.className = `drawer-badge ${data.category}`;

    // Show/hide sections based on category type
    const remediesSec = document.getElementById('section-remedies');
    const hydroSec = document.getElementById('section-hydration');
    const exerciseSec = document.getElementById('section-exercise');
    const recoverySec = document.getElementById('section-recovery');
    const selfcareSec = document.getElementById('section-selfcare');
    const partnerSec = document.getElementById('section-partner');

    if (data.category === 'physical') {
        remediesSec.style.display = 'block';
        hydroSec.style.display = 'block';
        exerciseSec.style.display = 'block';
        recoverySec.style.display = 'block';
        selfcareSec.style.display = 'none';
        partnerSec.style.display = 'none';

        document.getElementById('remedy-rem').innerText = data.remedy;
        document.getElementById('remedy-hydro').innerText = data.hydration;
        document.getElementById('remedy-exercise').innerText = data.exercise;
        document.getElementById('remedy-recovery').innerText = data.recovery;
    } else {
        // Emotional, Mental, Behavioral, Relationship categories
        remediesSec.style.display = 'block';
        hydroSec.style.display = 'none';
        exerciseSec.style.display = 'none';
        recoverySec.style.display = 'none';
        selfcareSec.style.display = 'block';

        document.getElementById('remedy-rem').innerText = data.remedy;
        document.getElementById('remedy-selfcare').innerText = data.selfcare || data.remedy;

        // Partner Support advice
        if (data.partner && data.partner.length > 0) {
            partnerSec.style.display = 'block';
            const partnerContainer = document.getElementById('remedy-partner');
            partnerContainer.innerHTML = data.partner.map(p => `• ${p}`).join('<br><br>');
        } else {
            partnerSec.style.display = 'none';
        }
    }

    // Toggle drawer active
    overlay.classList.add('active');
    setTimeout(() => drawer.classList.add('active'), 50);
}

function closeRemedyDrawer() {
    const overlay = document.getElementById('remedy-drawer-overlay');
    const drawer = document.getElementById('remedy-drawer');
    
    drawer.classList.remove('active');
    setTimeout(() => overlay.classList.remove('active'), 300);
}

// Map openRemedyDrawer to window scope for inline onclicks on calendar pill badges
window.openRemedyDrawer = openRemedyDrawer;

// ------------------ Charting Analytics Logic ------------------
function renderCharts() {
    const isDark = document.body.classList.contains('dark-mode');
    const labelColor = isDark ? '#c2b9d2' : '#585168';
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(132, 115, 175, 0.1)';
    
    if (state.charts.mood) state.charts.mood.destroy();
    if (state.charts.symptom) state.charts.symptom.destroy();
    if (state.charts.cycle) state.charts.cycle.destroy();

    const moodLogs = state.dailyLogs
        .filter(l => l.mood)
        .sort((a,b) => new Date(a.date) - new Date(b.date))
        .slice(-15);

    // 1. Mood Chart
    const ctxMood = document.getElementById('moodChart').getContext('2d');
    state.charts.mood = new Chart(ctxMood, {
        type: 'line',
        data: {
            labels: moodLogs.map(l => formatDisplayDate(l.date, true)),
            datasets: [{
                data: moodLogs.map(l => MOOD_VALUES[l.mood] || 3),
                borderColor: '#b580ff',
                backgroundColor: 'rgba(181, 128, 255, 0.1)',
                borderWidth: 3,
                tension: 0.35,
                fill: true,
                pointBackgroundColor: moodLogs.map(l => MOOD_COLORS[l.mood] || '#fff'),
                pointBorderColor: '#fff',
                pointRadius: 6,
                pointHoverRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const index = context.dataIndex;
                            const log = moodLogs[index];
                            return ` Mood: ${log.mood} (${context.raw}/5)`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    min: 1,
                    max: 5,
                    ticks: {
                        stepSize: 1,
                        color: labelColor,
                        callback: function(value) {
                            const labels = { 5: '😊', 4: '😐', 3: '😴', 2: '🤐', 1: '😔' };
                            return labels[value] || '';
                        }
                    },
                    grid: { color: gridColor }
                },
                x: {
                    ticks: { color: labelColor },
                    grid: { display: false }
                }
            }
        }
    });

    // 2. Symptom Frequency Chart
    const symptomCounts = {};
    state.dailyLogs.forEach(log => {
        if (log.symptoms) {
            log.symptoms.forEach(s => {
                symptomCounts[s] = (symptomCounts[s] || 0) + 1;
            });
        }
    });

    const symptomLabels = Object.keys(symptomCounts);
    const symptomData = Object.values(symptomCounts);

    const ctxSymptom = document.getElementById('symptomChart').getContext('2d');
    state.charts.symptom = new Chart(ctxSymptom, {
        type: 'bar',
        data: {
            labels: symptomLabels,
            datasets: [{
                data: symptomData,
                backgroundColor: ['#ff758c', '#fa8231', '#fad0c4', '#ff9a9e', '#a18cd1', '#84fab0'],
                borderRadius: 8,
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { stepSize: 1, color: labelColor },
                    grid: { color: gridColor }
                },
                x: {
                    ticks: { color: labelColor },
                    grid: { display: false }
                }
            }
        }
    });

    // 3. Cycle History Chart
    const cycleLabels = [];
    const cycleData = [];
    
    const sorted = [...state.periods].sort((a,b) => new Date(a.startDate) - new Date(b.startDate));
    for (let i = 1; i < sorted.length; i++) {
        const startPrev = new Date(sorted[i-1].startDate);
        const startCurr = new Date(sorted[i].startDate);
        const length = Math.round((startCurr - startPrev) / (1000 * 60 * 60 * 24));
        
        cycleLabels.push(`Cycle ${i}`);
        cycleData.push(length);
    }

    if (cycleData.length === 0) {
        cycleLabels.push('Default');
        cycleData.push(state.user?.defaultCycleLength || 28);
    }

    const ctxCycle = document.getElementById('cycleChart').getContext('2d');
    state.charts.cycle = new Chart(ctxCycle, {
        type: 'bar',
        data: {
            labels: cycleLabels,
            datasets: [{
                label: 'Cycle Length',
                data: cycleData,
                backgroundColor: 'rgba(43, 203, 186, 0.45)',
                borderColor: '#2bcbba',
                borderWidth: 2,
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { color: labelColor },
                    grid: { color: gridColor }
                },
                x: {
                    ticks: { color: labelColor },
                    grid: { display: false }
                }
            }
        }
    });
}

// ------------------ Date Helpers ------------------

function getLocalDateString(date) {
    const d = new Date(date);
    const month = '' + (d.getMonth() + 1);
    const day = '' + d.getDate();
    const year = d.getFullYear();

    return [year, month.padStart(2, '0'), day.padStart(2, '0')].join('-');
}

function formatDisplayDate(dateStr, short = false) {
    if (!dateStr) return '--';
    const date = new Date(dateStr);
    const options = short 
        ? { month: 'short', day: 'numeric' }
        : { month: 'short', day: 'numeric', year: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}

function formatDisplayDateRange(startStr, endStr) {
    if (!startStr || !endStr) return '--';
    const start = new Date(startStr);
    const end = new Date(endStr);
    
    const startOpt = { month: 'short', day: 'numeric' };
    const endOpt = start.getFullYear() !== end.getFullYear()
        ? { month: 'short', day: 'numeric', year: 'numeric' }
        : (start.getMonth() === end.getMonth() ? { day: 'numeric', year: 'numeric' } : { month: 'short', day: 'numeric', year: 'numeric' });
        
    return `${start.toLocaleDateString('en-US', startOpt)} – ${end.toLocaleDateString('en-US', endOpt)}`;
}

// Dynamic Toast notification popup
function showNotificationToast(message, isError = false) {
    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    if (isError) toast.classList.add('error');
    toast.innerHTML = `
        <div class="toast-body">
            <i class="fa-solid ${isError ? 'fa-triangle-exclamation' : 'fa-circle-check'} mr-10"></i>
            <span>${message}</span>
        </div>
    `;
    
    if (!document.getElementById('toast-styles')) {
        const style = document.createElement('style');
        style.id = 'toast-styles';
        style.innerText = `
            .toast-notification {
                position: fixed;
                bottom: 30px;
                right: 30px;
                background: rgba(13, 9, 27, 0.85);
                border: 1px solid var(--card-border);
                backdrop-filter: blur(15px);
                padding: 14px 20px;
                border-radius: 12px;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
                color: #fff;
                z-index: 1000;
                transform: translateY(100px);
                opacity: 0;
                transition: all 0.35s cubic-bezier(0.68, -0.55, 0.27, 1.55);
            }
            .toast-notification.active {
                transform: translateY(0);
                opacity: 1;
            }
            .toast-notification.error {
                border-left: 4px solid var(--period-color);
            }
            .toast-notification:not(.error) {
                border-left: 4px solid var(--normal-color);
            }
            .toast-body {
                display: flex;
                align-items: center;
                font-size: 14px;
            }
        `;
        document.head.appendChild(style);
    }
    
    document.body.appendChild(toast);
    
    setTimeout(() => toast.classList.add('active'), 50);
    
    setTimeout(() => {
        toast.classList.remove('active');
        setTimeout(() => toast.remove(), 400);
    }, 3500);
}

// End Period Modal Controllers
function openEndPeriodModal(id, startStr) {
    document.getElementById('end-period-id').value = id;
    document.getElementById('end-period-start-display').value = startStr;
    document.getElementById('end-period-date').value = getLocalDateString(new Date());
    document.getElementById('end-period-error').innerText = '';
    document.getElementById('end-period-modal').style.display = 'flex';
}

function closeEndPeriodModal() {
    document.getElementById('end-period-modal').style.display = 'none';
}

function getAvatarState(predictions, todayLog) {
    const activePhase = predictions.currentPhase;
    const activeSymptoms = todayLog ? todayLog.symptoms : [];
    const todayMood = todayLog ? todayLog.mood : "";
    const energyVal = (todayLog && todayLog.energyLevel !== undefined) ? todayLog.energyLevel : 3;

    if (todayMood === "😊") return "happy";
    if (todayMood === "😴") return "tired";
    if (todayMood === "😡") return "irritated";
    if (todayMood === "🤐") return "needs_space";

    const symptomsLower = activeSymptoms.map(s => s.toLowerCase());

    if (symptomsLower.includes("irritability") || symptomsLower.includes("anger") || symptomsLower.includes("frustration")) {
        return "irritated";
    }
    if (symptomsLower.includes("need for space") || symptomsLower.includes("silent behavior") || symptomsLower.includes("avoiding people")) {
        return "needs_space";
    }
    if (symptomsLower.includes("anxiety") || symptomsLower.includes("overthinking") || symptomsLower.includes("racing thoughts")) {
        return "anxious";
    }
    if (symptomsLower.includes("need for comfort") || symptomsLower.includes("need for affection") || symptomsLower.includes("need for reassurance") || symptomsLower.includes("feeling unsupported")) {
        return "needs_support";
    }
    if (symptomsLower.includes("emotional sensitivity") || symptomsLower.includes("crying easily") || symptomsLower.includes("feeling insecure")) {
        return "sensitive";
    }
    if (symptomsLower.includes("fatigue") || symptomsLower.includes("sleepiness") || symptomsLower.includes("insomnia") || symptomsLower.includes("mental fatigue") || energyVal <= 2) {
        return "tired";
    }
    if (energyVal >= 5) {
        return "energetic";
    }
    if (activePhase === "OVULATION" && activeSymptoms.length === 0) {
        return "happy";
    }

    return "calm";
}

function getAnimatedAvatarSVG(state) {
    let eyes = "";
    let mouth = "";
    let extra = "";
    let gradientStart = "#8B5CF6";
    let gradientEnd = "#EC4899";
    let glow = "rgba(139, 92, 246, 0.4)";
    let animationClass = "luna-calm";

    switch(state) {
        case "happy":
            gradientStart = "#10B981"; gradientEnd = "#34D399";
            glow = "rgba(16, 185, 129, 0.4)";
            animationClass = "luna-happy";
            eyes = `<path d="M30 42 Q35 34 40 42" stroke="white" stroke-width="4.5" fill="none" stroke-linecap="round"/>
                    <path d="M60 42 Q65 34 70 42" stroke="white" stroke-width="4.5" fill="none" stroke-linecap="round"/>`;
            mouth = `<path d="M40 55 Q50 68 60 55" stroke="white" stroke-width="4.5" fill="none" stroke-linecap="round"/>`;
            break;
        case "sensitive":
            gradientStart = "#FB7185"; gradientEnd = "#FDA4AF";
            glow = "rgba(251, 113, 133, 0.4)";
            animationClass = "luna-sensitive";
            eyes = `<circle cx="35" cy="42" r="7" fill="white"/>
                    <circle cx="35" cy="40" r="3" fill="#0b0b0f"/>
                    <circle cx="33" cy="44" r="2" fill="white" opacity="0.8"/>
                    <circle cx="65" cy="42" r="7" fill="white"/>
                    <circle cx="65" cy="40" r="3" fill="#0b0b0f"/>
                    <circle cx="63" cy="44" r="2" fill="white" opacity="0.8"/>`;
            mouth = `<path d="M44 60 Q50 56 56 60" stroke="white" stroke-width="3.5" fill="none" stroke-linecap="round"/>`;
            extra = `<circle cx="35" cy="48" r="2.5" fill="#67e8f9" class="tear-drop"/>`;
            break;
        case "tired":
            gradientStart = "#F59E0B"; gradientEnd = "#FBBF24";
            glow = "rgba(245, 158, 11, 0.4)";
            animationClass = "luna-tired";
            eyes = `<line x1="28" y1="42" x2="38" y2="42" stroke="white" stroke-width="4" stroke-linecap="round"/>
                    <line x1="62" y1="42" x2="72" y2="42" stroke="white" stroke-width="4" stroke-linecap="round"/>`;
            mouth = `<circle cx="50" cy="58" r="5" fill="white"/>`;
            break;
        case "irritated":
            gradientStart = "#EF4444"; gradientEnd = "#F87171";
            glow = "rgba(239, 68, 68, 0.4)";
            animationClass = "luna-irritated";
            eyes = `<path d="M26 36 L38 42" stroke="white" stroke-width="4.5" stroke-linecap="round"/>
                    <path d="M74 36 L62 42" stroke="white" stroke-width="4.5" stroke-linecap="round"/>
                    <circle cx="33" cy="47" r="3.5" fill="white"/>
                    <circle cx="67" cy="47" r="3.5" fill="white"/>`;
            mouth = `<path d="M42 62 Q50 50 58 62" stroke="white" stroke-width="4.5" fill="none" stroke-linecap="round"/>`;
            break;
        case "needs_support":
            gradientStart = "#8B5CF6"; gradientEnd = "#A78BFA";
            glow = "rgba(139, 92, 246, 0.4)";
            animationClass = "luna-support";
            eyes = `<circle cx="35" cy="42" r="6" fill="white"/>
                    <circle cx="65" cy="42" r="6" fill="white"/>`;
            mouth = `<path d="M44 58 Q50 64 56 58" stroke="white" stroke-width="4.5" fill="none" stroke-linecap="round"/>`;
            break;
        case "needs_space":
            gradientStart = "#4B5563"; gradientEnd = "#9CA3AF";
            glow = "rgba(75, 85, 99, 0.3)";
            animationClass = "luna-space";
            eyes = `<circle cx="35" cy="44" r="3" fill="white"/>
                    <circle cx="65" cy="44" r="3" fill="white"/>`;
            mouth = `<line x1="42" y1="58" x2="58" y2="58" stroke="white" stroke-width="4" stroke-linecap="round"/>`;
            break;
        case "anxious":
            gradientStart = "#14B8A6"; gradientEnd = "#2DD4BF";
            glow = "rgba(20, 184, 166, 0.4)";
            animationClass = "luna-anxious";
            eyes = `<circle cx="33" cy="42" r="6" fill="white"/>
                    <circle cx="33" cy="42" r="2" fill="#0b0b0f"/>
                    <circle cx="67" cy="42" r="6" fill="white"/>
                    <circle cx="67" cy="42" r="2" fill="#0b0b0f"/>`;
            mouth = `<path d="M40 58 Q45 54 50 58 Q55 62 60 58" stroke="white" stroke-width="4" fill="none" stroke-linecap="round"/>`;
            break;
        case "energetic":
            gradientStart = "#F59E0B"; gradientEnd = "#EF4444";
            glow = "rgba(245, 158, 11, 0.5)";
            animationClass = "luna-energetic";
            eyes = `<polygon points="35,28 37,34 43,35 38,39 39,45 35,42 31,45 32,39 27,35 33,34" fill="white"/>
                    <polygon points="65,28 67,34 73,35 68,39 69,45 65,42 61,45 62,39 57,35 63,34" fill="white"/>`;
            mouth = `<path d="M40 54 Q50 66 60 54 Z" fill="white"/>`;
            break;
        case "calm":
        default:
            gradientStart = "#8B5CF6"; gradientEnd = "#EC4899";
            glow = "rgba(139, 92, 246, 0.4)";
            animationClass = "luna-calm";
            eyes = `<path d="M28 44 Q35 48 40 44" stroke="white" stroke-width="4.5" fill="none" stroke-linecap="round"/>
                    <path d="M60 44 Q67 48 72 44" stroke="white" stroke-width="4.5" fill="none" stroke-linecap="round"/>`;
            mouth = `<path d="M44 56 Q50 60 56 56" stroke="white" stroke-width="3.5" fill="none" stroke-linecap="round"/>`;
            break;
    }

    return `
    <svg class="luna-avatar ${animationClass}" viewBox="0 0 100 100" style="width: 100%; height: 100%; filter: drop-shadow(0 0 15px ${glow});">
        <defs>
            <radialGradient id="avatarGlow-${state}" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stop-color="${gradientEnd}" />
                <stop offset="100%" stop-color="${gradientStart}" />
            </radialGradient>
        </defs>
        <circle cx="50" cy="50" r="38" fill="url(#avatarGlow-${state})" />
        <g class="luna-face">
            ${eyes}
            ${mouth}
            ${extra}
        </g>
    </svg>
    `;
}

function checkUrlParams() {
    const urlParams = new URLSearchParams(window.location.search);
    const partnerToken = urlParams.get('partnerToken');
    const resetToken = urlParams.get('resetToken');
    
    if (partnerToken) {
        document.getElementById('auth-overlay').style.display = 'none';
        document.getElementById('app-container').style.display = 'none';
        document.getElementById('partner-dashboard-view').style.display = 'block';
        
        const stored = safeStorage.getItem('user');
        if (stored) {
            document.getElementById('partner-back-btn').style.display = 'flex';
        } else {
            document.getElementById('partner-back-btn').style.display = 'none';
        }
        
        initPartnerDashboardView(partnerToken);
        return true;
    }
    
    if (resetToken) {
        document.getElementById('app-container').style.display = 'none';
        document.getElementById('partner-dashboard-view').style.display = 'none';
        showResetPasswordView(resetToken);
        return true;
    }
    
    return false;
}

async function initPartnerDashboardView(token) {
    // Setup back button event listener
    const partnerBackBtn = document.getElementById('partner-back-btn');
    if (partnerBackBtn) {
        // Clear any previous listeners to avoid duplicates
        const newBackBtn = partnerBackBtn.cloneNode(true);
        partnerBackBtn.parentNode.replaceChild(newBackBtn, partnerBackBtn);
        newBackBtn.addEventListener('click', () => {
            // Stop polling
            if (partnerDashboardPollInterval) {
                clearInterval(partnerDashboardPollInterval);
                partnerDashboardPollInterval = null;
            }
            document.getElementById('partner-dashboard-view').style.display = 'none';
            // Show main app dashboard
            showDashboard();
            // Clear URL parameter
            window.history.pushState({}, document.title, window.location.pathname);
        });
    }

    // Initial fetch
    await refreshPartnerDashboardView(token);
    
    // Setup 30-second live update polling
    if (partnerDashboardPollInterval) {
        clearInterval(partnerDashboardPollInterval);
    }
    partnerDashboardPollInterval = setInterval(() => refreshPartnerDashboardView(token), 30000);
}

async function refreshPartnerDashboardView(token) {
    try {
        const res = await fetch(`${API_BASE}/partner/public/status?token=${token}`);
        if (!res.ok) {
            if (res.status === 403) {
                showPartnerDashboardError('This secure connection link is invalid or has been disabled.');
            } else {
                showPartnerDashboardError('Error loading dashboard data.');
            }
            return;
        }

        const data = await res.json();
        updatePartnerDashboardUI(data);
    } catch (err) {
        console.error('Failed to sync partner status:', err);
    }
}

function updatePartnerDashboardUI(data) {
    document.getElementById('partner-user-name').innerText = `${data.userName}'s Connection`;
    document.getElementById('partner-display-mood-emoji').innerText = data.moodEmoji;
    document.getElementById('partner-display-mood-text').innerText = data.mood;
    
    const phase = data.phase;
    let phaseLabel = `${phase.substring(0, 1) + phase.substring(1).toLowerCase()} Phase`;
    if (phase === 'OVULATION') phaseLabel = '🌱 Ovulation - High Energy';
    else if (phase === 'FOLLICULAR') phaseLabel = '🌱 Follicular Phase';
    else if (phase === 'MENSTRUAL') phaseLabel = '🩸 Menstrual Phase';
    else if (phase === 'LUTEAL') phaseLabel = '🌙 Luteal Phase';
    document.getElementById('partner-display-phase').innerText = phaseLabel;

    document.getElementById('partner-days-value').innerText = `Cycle Day ${data.currentDay}`;
    document.getElementById('partner-days-left').innerText = `${data.daysRemaining} days left`;
    
    const pct = Math.min(Math.max((data.currentDay / data.totalDays) * 100, 0), 100) || 0;
    document.getElementById('partner-progress-fill').style.width = `${pct}%`;

    document.getElementById('partner-energy-val').innerText = data.energy;
    document.getElementById('partner-wellness-val').innerText = data.wellness;

    const wIcon = document.getElementById('partner-wellness-icon');
    if (wIcon) {
        if (data.wellness === 'Low') {
            wIcon.className = 'cell-icon text-rose';
            wIcon.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i>';
        } else if (data.wellness === 'High') {
            wIcon.className = 'cell-icon text-teal';
            wIcon.innerHTML = '<i class="fa-solid fa-circle-check"></i>';
        } else {
            wIcon.className = 'cell-icon text-amber';
            wIcon.innerHTML = '<i class="fa-solid fa-heart"></i>';
        }
    }

    document.getElementById('partner-support-suggestion').innerText = data.suggestion;

    const avatarContainer = document.getElementById('partner-dashboard-avatar-container');
    if (avatarContainer) {
        avatarContainer.innerHTML = getAnimatedAvatarSVG(data.avatarState);
    }

    const glowCard = document.getElementById('character-card-glow');
    if (glowCard) {
        glowCard.className = `card-glow glow-${data.avatarState}`;
    }
}

function showPartnerDashboardError(msg) {
    const main = document.querySelector('.partner-dashboard-main');
    if (main) {
        main.innerHTML = `
            <div class="glass-card text-center mt-40" style="max-width: 500px; margin: 40px auto; padding: 40px;">
                <div class="text-rose" style="font-size: 48px; margin-bottom: 20px;"><i class="fa-solid fa-circle-exclamation"></i></div>
                <h3 style="color: #ffffff;">Access Denied</h3>
                <p class="mt-15" style="color: var(--text-muted); line-height: 1.6;">${msg}</p>
                <div class="mt-30">
                    <p style="font-size: 12px; color: #5c5c75;">LunaFlow Secure Gateway</p>
                </div>
            </div>
        `;
    }
}

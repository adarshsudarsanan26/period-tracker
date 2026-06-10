package com.pms.tracker;

import com.pms.tracker.model.User;
import com.pms.tracker.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

@SpringBootTest(properties = {
    "spring.mail.username=test_smtp_user@gmail.com",
    "spring.mail.password=some_password",
    "spring.mail.host=localhost",
    "spring.mail.port=12345"
})
public class PartnerConfigControllerTest {

    private MockMvc mockMvc;

    @Autowired
    private WebApplicationContext webApplicationContext;

    @Autowired
    private UserRepository userRepository;

    @BeforeEach
    public void setup() {
        this.mockMvc = MockMvcBuilders.webAppContextSetup(this.webApplicationContext).build();
    }

    @Test
    public void testPartnerConfigSmtpError() throws Exception {
        // Create user
        User user = new User("test_partner2@example.com", "hash", "Test Partner User");
        user = userRepository.save(user);

        MockHttpSession session = new MockHttpSession();
        session.setAttribute("user", user);

        // Perform request
        MvcResult result = mockMvc.perform(post("/api/partner/config")
                .session(session)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"partnerEmail\":\"rghhhgf@gmail.com\"}"))
                .andReturn();

        assertEquals(500, result.getResponse().getStatus());
        org.junit.jupiter.api.Assertions.assertTrue(
                result.getResponse().getContentAsString().startsWith("❌ SMTP Configuration Error")
        );
    }
}

package co.edu.eci.blueprints.controllers;

import co.edu.eci.blueprints.exception.GlobalExceptionHandler;
import co.edu.eci.blueprints.model.Point;
import co.edu.eci.blueprints.persistence.BlueprintNotFoundException;
import co.edu.eci.blueprints.services.BlueprintsServices;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class BlueprintsAPIControllerTest {

    private static final String URL = "/api/v1/blueprints/john/house";

    private final BlueprintsServices services = mock(BlueprintsServices.class);
    private final MockMvc mvc = MockMvcBuilders.standaloneSetup(new BlueprintsAPIController(services))
            .setControllerAdvice(new GlobalExceptionHandler())
            .build();

    @Test
    void updateReplacesPointsAndReturnsTheBlueprint() throws Exception {
        mvc.perform(put(URL).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"points\":[{\"x\":1,\"y\":2},{\"x\":3,\"y\":4}]}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data.name").value("house"))
                .andExpect(jsonPath("$.data.points.length()").value(2));

        verify(services).updateBlueprint("john", "house", List.of(new Point(1, 2), new Point(3, 4)));
    }

    @Test
    void updateUnknownBlueprintReturns404() throws Exception {
        doThrow(new BlueprintNotFoundException("Blueprint not found: john/house"))
                .when(services).updateBlueprint(eq("john"), eq("house"), any());

        mvc.perform(put(URL).contentType(MediaType.APPLICATION_JSON).content("{\"points\":[]}"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Blueprint not found: john/house"));
    }

    @Test
    void updateWithoutPointsReturns400() throws Exception {
        mvc.perform(put(URL).contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value(400));

        verifyNoInteractions(services);
    }

    @Test
    void deleteReturns200() throws Exception {
        mvc.perform(delete(URL))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200));

        verify(services).deleteBlueprint("john", "house");
    }

    @Test
    void deleteUnknownBlueprintReturns404() throws Exception {
        doThrow(new BlueprintNotFoundException("Blueprint not found: john/house"))
                .when(services).deleteBlueprint("john", "house");

        mvc.perform(delete(URL))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value(404));
    }
}

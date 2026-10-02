package co.edu.eci.blueprints.realtime;

import co.edu.eci.blueprints.model.Point;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record DrawEvent(@NotBlank String author, @NotBlank String name, @NotNull Point point) {
}

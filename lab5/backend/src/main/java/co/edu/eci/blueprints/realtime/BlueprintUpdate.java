package co.edu.eci.blueprints.realtime;

import co.edu.eci.blueprints.model.Blueprint;
import co.edu.eci.blueprints.model.Point;

import java.util.List;

public record BlueprintUpdate(String author, String name, List<Point> points) {

    public BlueprintUpdate {
        points = List.copyOf(points);
    }

    public static BlueprintUpdate from(Blueprint blueprint) {
        return new BlueprintUpdate(blueprint.getAuthor(), blueprint.getName(), blueprint.getPoints());
    }
}

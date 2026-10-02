package co.edu.eci.blueprints.services;

import co.edu.eci.blueprints.model.Blueprint;

public interface BlueprintUpdatePublisher {

    void publish(Blueprint blueprint);
}

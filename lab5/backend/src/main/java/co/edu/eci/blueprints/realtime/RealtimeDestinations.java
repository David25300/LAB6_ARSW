package co.edu.eci.blueprints.realtime;

public final class RealtimeDestinations {

    public static final String DRAW = "/draw";
    public static final String ERRORS = "/queue/errors";
    private static final String BLUEPRINT_TOPIC = "/topic/blueprints.%s.%s";

    private RealtimeDestinations() {
    }

    public static String blueprintTopic(String author, String name) {
        return BLUEPRINT_TOPIC.formatted(author, name);
    }
}

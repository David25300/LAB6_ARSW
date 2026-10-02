package co.edu.eci.blueprints.realtime;

import co.edu.eci.blueprints.auth.AuthController.LoginRequest;
import co.edu.eci.blueprints.auth.AuthController.TokenResponse;
import co.edu.eci.blueprints.model.Blueprint;
import co.edu.eci.blueprints.model.Point;
import co.edu.eci.blueprints.services.BlueprintsServices;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.HttpHeaders;
import org.springframework.messaging.Message;
import org.springframework.messaging.converter.MappingJackson2MessageConverter;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessageType;
import org.springframework.messaging.simp.broker.SimpleBrokerMessageHandler;
import org.springframework.messaging.simp.stomp.StompFrameHandler;
import org.springframework.messaging.simp.stomp.StompHeaders;
import org.springframework.messaging.simp.stomp.StompSession;
import org.springframework.messaging.simp.stomp.StompSessionHandlerAdapter;
import org.springframework.messaging.support.MessageBuilder;
import org.springframework.web.socket.WebSocketHttpHeaders;
import org.springframework.web.socket.client.standard.StandardWebSocketClient;
import org.springframework.web.socket.messaging.WebSocketStompClient;

import java.lang.reflect.Type;
import java.time.Duration;
import java.util.List;
import java.util.Objects;
import java.util.UUID;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.awaitility.Awaitility.await;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
        "spring.datasource.url=jdbc:h2:mem:realtime;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.jpa.database-platform=org.hibernate.dialect.H2Dialect",
        "spring.jpa.show-sql=false"
})
class CollaborativeDrawingIntegrationTest {

    private static final Duration TIMEOUT = Duration.ofSeconds(5);
    private static final String AUTHOR = "john";

    @LocalServerPort
    private int port;

    @Autowired
    private TestRestTemplate rest;

    @Autowired
    private BlueprintsServices blueprints;

    @Autowired
    private SimpleBrokerMessageHandler broker;

    private WebSocketStompClient stompClient;

    @BeforeEach
    void setUp() {
        stompClient = new WebSocketStompClient(new StandardWebSocketClient());
        stompClient.setMessageConverter(new MappingJackson2MessageConverter());
    }

    @AfterEach
    void tearDown() {
        stompClient.stop();
    }

    @Test
    void pointsDrawnByOneClientArePersistedAndBroadcastToTheBlueprintTopicOnly() throws Exception {
        String name = uniqueName();
        String otherName = uniqueName();
        blueprints.addNewBlueprint(new Blueprint(AUTHOR, name, List.of(new Point(0, 0))));
        blueprints.addNewBlueprint(new Blueprint(AUTHOR, otherName, List.of()));
        String token = login();
        StompSession drawer = connect(token);
        StompSession viewer = connect(token);
        String topic = RealtimeDestinations.blueprintTopic(AUTHOR, name);
        String otherTopic = RealtimeDestinations.blueprintTopic(AUTHOR, otherName);
        BlockingQueue<BlueprintUpdate> updates = subscribe(viewer, topic, BlueprintUpdate.class);
        BlockingQueue<BlueprintUpdate> otherUpdates = subscribe(viewer, otherTopic, BlueprintUpdate.class);
        awaitBrokerSubscription(topic);
        awaitBrokerSubscription(otherTopic);

        drawer.send("/app" + RealtimeDestinations.DRAW, new DrawEvent(AUTHOR, name, new Point(10, 20)));

        BlueprintUpdate update = updates.poll(TIMEOUT.toSeconds(), TimeUnit.SECONDS);
        assertThat(update).isNotNull();
        assertThat(update.points()).containsExactly(new Point(0, 0), new Point(10, 20));
        assertThat(blueprints.getBlueprint(AUTHOR, name).getPoints()).containsExactly(new Point(0, 0), new Point(10, 20));
        assertThat(otherUpdates.poll(300, TimeUnit.MILLISECONDS)).isNull();
    }

    @Test
    void drawingOnAMissingBlueprintIsReportedToTheSender() throws Exception {
        StompSession session = connect(login());
        BlockingQueue<RealtimeError> errors = subscribe(session, "/user" + RealtimeDestinations.ERRORS, RealtimeError.class);
        DrawEvent event = new DrawEvent(AUTHOR, uniqueName(), new Point(1, 1));

        RealtimeError error = await().atMost(TIMEOUT).until(() -> {
            session.send("/app" + RealtimeDestinations.DRAW, event);
            return errors.poll(200, TimeUnit.MILLISECONDS);
        }, Objects::nonNull);

        assertThat(error.message()).contains("Blueprint not found");
    }

    @Test
    void connectingWithoutTokenIsRejected() throws Exception {
        CompletableFuture<StompHeaders> errorFrame = new CompletableFuture<>();

        stompClient.connectAsync(url(), new WebSocketHttpHeaders(), new StompHeaders(), new StompSessionHandlerAdapter() {
            @Override
            public void handleFrame(StompHeaders headers, Object payload) {
                errorFrame.complete(headers);
            }
        });

        assertThat(errorFrame.get(TIMEOUT.toSeconds(), TimeUnit.SECONDS).getFirst("message")).isNotBlank();
    }

    private String login() {
        TokenResponse response = rest.postForObject("/auth/login",
                new LoginRequest("student", "student123"), TokenResponse.class);
        return response.access_token();
    }

    private StompSession connect(String token) throws Exception {
        StompHeaders connectHeaders = new StompHeaders();
        connectHeaders.add(HttpHeaders.AUTHORIZATION, "Bearer " + token);
        return stompClient.connectAsync(url(), new WebSocketHttpHeaders(), connectHeaders, new StompSessionHandlerAdapter() { })
                .get(TIMEOUT.toSeconds(), TimeUnit.SECONDS);
    }

    private void awaitBrokerSubscription(String destination) {
        SimpMessageHeaderAccessor accessor = SimpMessageHeaderAccessor.create(SimpMessageType.MESSAGE);
        accessor.setDestination(destination);
        Message<byte[]> probe = MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());
        await().atMost(TIMEOUT).until(() -> !broker.getSubscriptionRegistry().findSubscriptions(probe).isEmpty());
    }

    private static <T> BlockingQueue<T> subscribe(StompSession session, String destination, Class<T> type) {
        BlockingQueue<T> received = new LinkedBlockingQueue<>();
        session.subscribe(destination, new StompFrameHandler() {
            @Override
            public Type getPayloadType(StompHeaders headers) {
                return type;
            }

            @Override
            public void handleFrame(StompHeaders headers, Object payload) {
                received.add(type.cast(payload));
            }
        });
        return received;
    }

    private String url() {
        return "ws://localhost:" + port + "/ws-blueprints";
    }

    private static String uniqueName() {
        return "plan-" + UUID.randomUUID();
    }
}

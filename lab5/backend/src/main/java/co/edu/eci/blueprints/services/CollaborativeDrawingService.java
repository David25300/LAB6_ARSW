package co.edu.eci.blueprints.services;

import co.edu.eci.blueprints.model.Blueprint;
import co.edu.eci.blueprints.model.Point;
import co.edu.eci.blueprints.persistence.BlueprintNotFoundException;
import org.springframework.stereotype.Service;

import java.util.concurrent.locks.Lock;
import java.util.concurrent.locks.ReentrantLock;
import java.util.stream.IntStream;

@Service
public class CollaborativeDrawingService {

    private static final int LOCK_STRIPES = 64;

    private final BlueprintsServices blueprints;
    private final BlueprintUpdatePublisher publisher;
    private final Lock[] locks = IntStream.range(0, LOCK_STRIPES)
            .mapToObj(i -> new ReentrantLock())
            .toArray(Lock[]::new);

    public CollaborativeDrawingService(BlueprintsServices blueprints, BlueprintUpdatePublisher publisher) {
        this.blueprints = blueprints;
        this.publisher = publisher;
    }

    public Blueprint draw(String author, String name, Point point) throws BlueprintNotFoundException {
        Lock lock = lockFor(author, name);
        lock.lock();
        try {
            Blueprint updated = blueprints.addPointAndGet(author, name, point);
            publisher.publish(updated);
            return updated;
        } finally {
            lock.unlock();
        }
    }

    private Lock lockFor(String author, String name) {
        int stripe = Math.floorMod((author + ':' + name).hashCode(), LOCK_STRIPES);
        return locks[stripe];
    }
}

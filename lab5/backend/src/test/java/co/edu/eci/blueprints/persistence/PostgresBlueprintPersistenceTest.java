package co.edu.eci.blueprints.persistence;

import co.edu.eci.blueprints.model.Point;
import co.edu.eci.blueprints.persistence.entity.BlueprintEntity;
import co.edu.eci.blueprints.persistence.entity.BlueprintJpaRepository;
import co.edu.eci.blueprints.persistence.entity.PointEntity;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class PostgresBlueprintPersistenceTest {

    private final BlueprintJpaRepository repo = mock(BlueprintJpaRepository.class);
    private final PostgresBlueprintPersistence persistence = new PostgresBlueprintPersistence(repo);

    @Test
    void updateReplacesTheEntityPoints() throws Exception {
        BlueprintEntity entity = new BlueprintEntity("john", "house");
        entity.addPoint(new PointEntity(0, 0));
        when(repo.findByAuthorAndName("john", "house")).thenReturn(Optional.of(entity));

        persistence.updateBlueprint("john", "house", List.of(new Point(1, 2), new Point(3, 4)));

        assertEquals(List.of(1, 3), entity.getPoints().stream().map(PointEntity::getX).toList());
        assertEquals(entity, entity.getPoints().get(0).getBlueprint());
        verify(repo).save(entity);
    }

    @Test
    void deleteRemovesTheEntity() throws Exception {
        BlueprintEntity entity = new BlueprintEntity("john", "house");
        when(repo.findByAuthorAndName("john", "house")).thenReturn(Optional.of(entity));

        persistence.deleteBlueprint("john", "house");

        verify(repo).delete(entity);
    }

    @Test
    void updateAndDeleteFailWhenTheBlueprintDoesNotExist() {
        when(repo.findByAuthorAndName(any(), any())).thenReturn(Optional.empty());
        List<Point> points = List.of();

        assertThrows(BlueprintNotFoundException.class, () -> persistence.updateBlueprint("nobody", "x", points));
        assertThrows(BlueprintNotFoundException.class, () -> persistence.deleteBlueprint("nobody", "x"));
        verify(repo, never()).save(any());
        verify(repo, never()).delete(any());
    }
}

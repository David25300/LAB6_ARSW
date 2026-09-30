package co.edu.eci.blueprints.persistence.entity;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;


//Genera la implementacion y el SQL solo con los nombre de los metodos
public interface BlueprintJpaRepository extends JpaRepository<BlueprintEntity, Long> {

    Optional<BlueprintEntity> findByAuthorAndName(String author, String name);

    List<BlueprintEntity> findByAuthor(String author);

    boolean existsByAuthorAndName(String author, String name);
}
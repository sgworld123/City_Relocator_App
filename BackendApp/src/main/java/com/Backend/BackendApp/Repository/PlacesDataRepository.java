package com.Backend.BackendApp.Repository;

import com.Backend.BackendApp.Entity.PlacesData;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface PlacesDataRepository extends MongoRepository<PlacesData, String> {
}

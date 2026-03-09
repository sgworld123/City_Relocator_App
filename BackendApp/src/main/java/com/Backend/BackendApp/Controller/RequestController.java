package com.Backend.BackendApp.Controller;

import com.Backend.BackendApp.Dto.CityRelocationRequestDto;
import com.Backend.BackendApp.Dto.PlaceDetailsDto;
import com.Backend.BackendApp.Dto.ResponseSourcesDto;
import com.Backend.BackendApp.Service.BackendService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/relocate")
@RequiredArgsConstructor
public class RequestController {
    private final BackendService backendService;

    @PostMapping
    public ResponseEntity<ResponseSourcesDto> getSimilarCities(@RequestBody CityRelocationRequestDto cityRelocationRequestDto) {
        if (cityRelocationRequestDto.getCurrent_city() == null ||
                cityRelocationRequestDto.getCurrent_city().getCoordinates() == null ||
                cityRelocationRequestDto.getSource_places() == null ||
                cityRelocationRequestDto.getSource_places().isEmpty()) {
            return ResponseEntity.badRequest().build();
        }
        return backendService.getSimilarPlaces(cityRelocationRequestDto);
    }

    @GetMapping("/health")
    public ResponseEntity<String> healthCheck() {
        return ResponseEntity.ok("Backend is up and running");
    }

    @PostMapping("/addPlaceData")
    public ResponseEntity<String> addPlaceData(@RequestBody PlaceDetailsDto placeDetailsDtos) {
        return ResponseEntity.ok(backendService.addPlaceData(placeDetailsDtos) ? "Place data added successfully" : "Failed to add place data");
    }
}

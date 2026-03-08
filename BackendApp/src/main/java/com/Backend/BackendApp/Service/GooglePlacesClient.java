package com.Backend.BackendApp.Service;

import com.google.maps.GeoApiContext;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class GooglePlacesClient {
    private final GeoApiContext geoApiContext;

}

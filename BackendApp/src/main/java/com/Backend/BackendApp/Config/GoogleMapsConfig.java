package com.Backend.BackendApp.Config;

import com.google.maps.GeoApiContext;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class GoogleMapsConfig {
    @Bean
    public GeoApiContext geoApiContext()
    {
        return new GeoApiContext.Builder()
                .apiKey("${apiKeys.GmapsApiKey}")
                .build();
    }
}

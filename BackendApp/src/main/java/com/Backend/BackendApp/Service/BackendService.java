package com.Backend.BackendApp.Service;

import com.Backend.BackendApp.Dto.CityRelocationRequestDto;
import com.Backend.BackendApp.Dto.GmapsResponseDto;
import com.Backend.BackendApp.Dto.PlaceDetailsDto;
import com.Backend.BackendApp.Dto.ResponseSourcesDto;
import com.Backend.BackendApp.Entity.PlacesData;
import com.Backend.BackendApp.Repository.PlacesDataRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.geo.*;
import org.springframework.data.redis.connection.RedisGeoCommands;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class BackendService {

    private final RedisTemplate redisTemplate;
    private final PlacesDataRepository placesRepository;
    private final GooglePlacesService googlePlacesService;
    public ResponseEntity<ResponseSourcesDto> getSimilarPlaces(CityRelocationRequestDto cityRelocationRequestDto) {
        double newCityLat = cityRelocationRequestDto.getCurrent_city().getCoordinates().getLat();
        double newCityLong = cityRelocationRequestDto.getCurrent_city().getCoordinates().getLng();
        List<PlaceDetailsDto> similarPlaces = new ArrayList<>();
        for(var source : cityRelocationRequestDto.getSource_places())
        {
            String placeType = source.getType();
            GeoResults<RedisGeoCommands.GeoLocation<Object>> results =
                    redisTemplate.opsForGeo()
                            .radius("places:geo",
                                    new Circle(new Point(newCityLong,newCityLat)
                                            ,new Distance(5, Metrics.KILOMETERS)));
            if(results.getContent().isEmpty())
            {
                try{
                    List<GmapsResponseDto> gmapsResponseDto = (List<GmapsResponseDto>) googlePlacesService.getNearByPlaces
                            (newCityLat, newCityLong, placeType).block();
                    if(gmapsResponseDto != null)                {
                        for(var result : gmapsResponseDto)
                        {
                            PlaceDetailsDto placeDetailsDto = PlaceDetailsDto.builder()
                                    .name(result.getName())
                                    .type(result.getType())
                                    .rating(result.getRating())
                                    .address(result.getAddress())
                                    .coordinatesDto(result.getCoordinatesDto())
                                    .build();
                            similarPlaces.add(placeDetailsDto);
                            addPlaceData(placeDetailsDto);
                        }
                    }
                }
                catch (Exception e)
                {
                    log.error("Error fetching from Google Places API: " + e.getMessage());
                }
            }
            else
            {
                for (GeoResult<RedisGeoCommands.GeoLocation<Object>> result : results) {
                    String placeId = (String) result.getContent().getName();
                    PlacesData placeData = placesRepository.findById(placeId).orElse(null);
                    if (placeData != null) {
                        PlaceDetailsDto placeDetailsDto = PlaceDetailsDto.builder()
                                .name(placeData.getName())
                                .type(placeData.getType())
                                .rating(placeData.getRating())
                                .address(placeData.getAddress())
                                .coordinatesDto(placeData.getCoordinatesDto())
                                .build();
                        similarPlaces.add(placeDetailsDto);
                    }
                }
            }
        }
        return ResponseEntity.ok(ResponseSourcesDto.builder().results(similarPlaces).build());
    }
    public boolean addPlaceData(PlaceDetailsDto placeDetailsDtos) {
        try
        {
            PlacesData placesData = PlacesData.builder()
                    .name(placeDetailsDtos.getName())
                    .type(placeDetailsDtos.getType())
                    .rating(placeDetailsDtos.getRating())
                    .address(placeDetailsDtos.getAddress())
                    .coordinatesDto(placeDetailsDtos.getCoordinatesDto())
                    .build();
            PlacesData savedPlace = placesRepository.save(placesData);
        redisTemplate.opsForGeo().add("places:geo",
                new Point(savedPlace.getCoordinatesDto().getLng(), savedPlace.getCoordinatesDto().getLat()),
                savedPlace.getId());
            return true;
        }
        catch (Exception e)
        {
            System.out.println(e.getMessage());
            return false;
        }
    }
}

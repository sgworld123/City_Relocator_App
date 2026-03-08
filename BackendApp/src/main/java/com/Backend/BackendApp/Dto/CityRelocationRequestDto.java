package com.Backend.BackendApp.Dto;

import com.Backend.BackendApp.Dto.CityDto;
import com.Backend.BackendApp.Dto.PlaceDto;
import lombok.Data;
import java.util.List;

@Data
public class CityRelocationRequestDto {

    private CityDto previous_city;
    private CityDto current_city;
    private List<PlaceDto> source_places;
}
package com.Backend.BackendApp.Dto;

import com.Backend.BackendApp.Dto.CoordinatesDto;
import lombok.Data;

@Data
public class PlaceDto {

    private String type;
    private String name;
    private CoordinatesDto coordinates;
}
package com.Backend.BackendApp.Dto;

import lombok.Data;

@Data
public class CityDto {
    private String name;
    private CoordinatesDto coordinates;
}
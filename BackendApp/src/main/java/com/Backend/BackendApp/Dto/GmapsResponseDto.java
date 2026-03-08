package com.Backend.BackendApp.Dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class GmapsResponseDto {
    private String name;
    private String type;
    private Double rating;
    private String address;
    private CoordinatesDto coordinatesDto;

}

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { squareApi } from '@/services/squareApi';
import { TeamMember, PerformanceMetrics, RestaurantAnalytics } from '@/types/square';

// Query keys for React Query
export const squareQueryKeys = {
  locations: ['square', 'locations'] as const,
  teamMembers: ['square', 'teamMembers'] as const,
  performanceMetrics: (startDate: string, endDate: string, teamMemberId?: string) => 
    ['square', 'performance', { startDate, endDate, teamMemberId }] as const,
  restaurantAnalytics: (startDate: string, endDate: string) => 
    ['square', 'restaurantAnalytics', { startDate, endDate }] as const,
};

// Hook for fetching locations
export const useLocations = () => {
  return useQuery({
    queryKey: squareQueryKeys.locations,
    queryFn: () => squareApi.getLocations(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });
};

// Hook for fetching team members
export const useTeamMembers = () => {
  return useQuery({
    queryKey: squareQueryKeys.teamMembers,
    queryFn: () => squareApi.getTeamMembers(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });
};

// Hook for fetching performance metrics
export const usePerformanceMetrics = (
  startDate: Date,
  endDate: Date,
  teamMemberId?: string,
  enabled: boolean = true
) => {
  return useQuery({
    queryKey: squareQueryKeys.performanceMetrics(
      startDate.toISOString(),
      endDate.toISOString(),
      teamMemberId
    ),
    queryFn: () => squareApi.getPerformanceMetrics(startDate, endDate, teamMemberId),
    enabled,
    staleTime: 2 * 60 * 1000, // 2 minutes for performance data
    retry: 1,
  });
};

// Hook for manual performance metrics generation
export const useGeneratePerformanceMetrics = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ startDate, endDate, teamMemberId }: {
      startDate: Date;
      endDate: Date;
      teamMemberId?: string;
    }) => squareApi.getPerformanceMetrics(startDate, endDate, teamMemberId),
    onSuccess: (data, variables) => {
      // Update the cache with the new data
      queryClient.setQueryData(
        squareQueryKeys.performanceMetrics(
          variables.startDate.toISOString(),
          variables.endDate.toISOString(),
          variables.teamMemberId
        ),
        data
      );
    },
  });
};

// Hook for fetching restaurant analytics
export const useRestaurantAnalytics = (
  startDate: Date,
  endDate: Date,
  enabled: boolean = true
) => {
  return useQuery({
    queryKey: squareQueryKeys.restaurantAnalytics(
      startDate.toISOString(),
      endDate.toISOString()
    ),
    queryFn: () => squareApi.getRestaurantAnalytics(startDate, endDate),
    enabled,
    staleTime: 2 * 60 * 1000, // 2 minutes for analytics data
    retry: 1,
  });
};

// Hook for manual restaurant analytics generation
export const useGenerateRestaurantAnalytics = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ startDate, endDate }: {
      startDate: Date;
      endDate: Date;
    }) => squareApi.getRestaurantAnalytics(startDate, endDate),
    onSuccess: (data, variables) => {
      // Update the cache with the new data
      queryClient.setQueryData(
        squareQueryKeys.restaurantAnalytics(
          variables.startDate.toISOString(),
          variables.endDate.toISOString()
        ),
        data
      );
    },
  });
};

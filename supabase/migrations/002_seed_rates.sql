-- Seed rate_master from Excel Sheet1
insert into public.rate_master (occupancy, eq_zone, iib_rate, eq_rate, stfi_rate, terrorism_rate, discount_under_5cr, discount_iib_over_5cr, discount_eq_over_5cr, discount_stfi_over_5cr, rate_under_5cr_without_terror, rate_over_5cr_without_terror, rate_under_5cr_with_terror, rate_over_5cr_with_terror) values
('Office premises', 1, 0.25, 0.25, 0.22, 0.13, 70.0, 100.0, 0.0, 0.0, 0.216, 0.47, 0.346, 0.6),
('Office premises', 2, 0.25, 0.15, 0.22, 0.13, 70.0, 100.0, 0.0, 0.0, 0.186, 0.37, 0.316, 0.5),
('Office premises', 3, 0.25, 0.1, 0.22, 0.13, 70.0, 100.0, 0.0, 0.0, 0.171, 0.32, 0.301, 0.45),
('Office premises', 4, 0.25, 0.05, 0.22, 0.13, 70.0, 100.0, 0.0, 0.0, 0.156, 0.27, 0.286, 0.4),
('Motor vehicle Showrooms (Sales and Service)', 1, 0.47, 0.25, 0.22, 0.13, 70.0, 100.0, 0.0, 0.0, 0.282, 0.47, 0.412, 0.6),
('Motor vehicle Showrooms (Sales and Service)', 2, 0.47, 0.15, 0.22, 0.13, 70.0, 100.0, 0.0, 0.0, 0.252, 0.37, 0.382, 0.5),
('Motor vehicle Showrooms (Sales and Service)', 3, 0.47, 0.1, 0.22, 0.13, 70.0, 100.0, 0.0, 0.0, 0.237, 0.32, 0.367, 0.45),
('Motor vehicle Showrooms (Sales and Service)', 4, 0.47, 0.05, 0.22, 0.13, 70.0, 100.0, 0.0, 0.0, 0.222, 0.27, 0.352, 0.4),
('Motor Vehicle Garages (No sales)', 1, 0.61, 0.5, 0.37, 0.21, 70.0, 100.0, 0.0, 0.0, 0.444, 0.87, 0.654, 1.08),
('Motor Vehicle Garages (No sales)', 2, 0.61, 0.25, 0.37, 0.21, 70.0, 100.0, 0.0, 0.0, 0.369, 0.62, 0.579, 0.83),
('Motor Vehicle Garages (No sales)', 3, 0.61, 0.1, 0.37, 0.21, 70.0, 100.0, 0.0, 0.0, 0.324, 0.47, 0.534, 0.68),
('Motor Vehicle Garages (No sales)', 4, 0.61, 0.05, 0.37, 0.21, 70.0, 100.0, 0.0, 0.0, 0.309, 0.42, 0.519, 0.63),
('Stockyard (Vehicles stored in closed warehouse)', 1, 0.98, 0.5, 0.52, 0.21, 70.0, 100.0, 0.0, 0.0, 0.6, 1.02, 0.81, 1.23),
('Stockyard (Vehicles stored in closed warehouse)', 2, 0.98, 0.25, 0.52, 0.21, 70.0, 100.0, 0.0, 0.0, 0.525, 0.77, 0.735, 0.98),
('Stockyard (Vehicles stored in closed warehouse)', 3, 0.98, 0.1, 0.52, 0.21, 70.0, 100.0, 0.0, 0.0, 0.48, 0.62, 0.69, 0.83),
('Stockyard (Vehicles stored in closed warehouse)', 4, 0.98, 0.05, 0.52, 0.21, 70.0, 100.0, 0.0, 0.0, 0.465, 0.57, 0.675, 0.78),
('Stockyard (Vehicles stored in Open warehouse)', 1, 2.33, 0.5, 2.25, 0.21, 70.0, 100.0, 0.0, 0.0, 1.524, 2.75, 1.734, 2.96),
('Stockyard (Vehicles stored in Open warehouse)', 2, 2.33, 0.25, 2.25, 0.21, 70.0, 100.0, 0.0, 0.0, 1.449, 2.5, 1.659, 2.71),
('Stockyard (Vehicles stored in Open warehouse)', 3, 2.33, 0.1, 2.25, 0.21, 70.0, 100.0, 0.0, 0.0, 1.404, 2.35, 1.614, 2.56),
('Stockyard (Vehicles stored in Open warehouse)', 4, 2.33, 0.05, 2.25, 0.21, 70.0, 100.0, 0.0, 0.0, 1.389, 2.3, 1.599, 2.51)
on conflict (occupancy, eq_zone) do nothing;
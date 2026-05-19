# GroveOS bill of materials

Quantities below are for a single rack of four shelves. Multiply per shelf
or per rack where noted.

## Compute

| Item                                      | Qty | Notes                                |
|-------------------------------------------|-----|--------------------------------------|
| NVIDIA Jetson Orin Nano 8GB Dev Kit       | 1   | Edge AI; runs Ubuntu 22.04 L4T       |
| ESP32-S3 DevKitC-1 (16MB flash, 8MB PSRAM)| 3   | sensor / safety / composter MCUs     |
| 256 GB NVMe (M.2 2230) for the Jetson     | 1   | TSDB + logs                          |

## Per-shelf sensors

| Item                                  | Qty/shelf | Notes                              |
|---------------------------------------|-----------|------------------------------------|
| Capacitive moisture probe v2.0        | 3         | tray corners                       |
| Sensirion SHT41 temp/humidity         | 1         | I²C                                |
| Noctua NF-A12x25 24V PWM fan          | 1         |                                    |

## Shared (per rack)

| Item                                       | Qty | Notes                              |
|--------------------------------------------|-----|------------------------------------|
| Atlas Scientific K1.0 conductivity probe   | 1   | inline EC on supply manifold       |
| Atlas Scientific EZO Conductivity circuit  | 1   | I²C                                |
| Atlas Scientific lab-grade pH probe        | 1   | inline pH on supply manifold       |
| Atlas Scientific EZO pH circuit            | 1   | I²C                                |
| Apogee SQ-520 PAR sensor                   | 1   | LED dim calibration                |
| Hall-effect flow sensor (G1/2")            | 1   | supply manifold                    |
| Raspberry Pi Camera Module 3 (IMX708)      | 1   | on pan/tilt mount                  |
| Pan/tilt mount with two SG90 servos        | 1   |                                    |

## Actuators

| Item                                  | Qty | Notes                                  |
|---------------------------------------|-----|----------------------------------------|
| Kamoer KPHM100 12V peristaltic pump   | 8   | 6 base reservoirs + slurry + clean H₂O |
| 12V 1/2" plastic NC solenoid valve    | 5   | per shelf + drain bypass               |
| Eheim 600 L/h submersible pump        | 1   | recirculation                          |
| Mean Well HLG-185H-24B LED driver     | 4   | one per shelf                          |

## Composter

| Item                                    | Qty | Notes                                |
|-----------------------------------------|-----|--------------------------------------|
| 1/4 HP geared grinder motor (12V)       | 1   | thermal cutout required              |
| 300 W silicone heater pad               | 1   | bonded to slurry tank wall           |
| 10 kΩ NTC thermistor                    | 2   | tank + ambient                       |
| Aquarium air pump (small)               | 1   | aeration                             |
| Capacitive liquid level sensor          | 1   | slurry tank                          |
| Atlas EC + pH pair                      | 1   | slurry tank                          |

## Safety + power

| Item                                  | Qty | Notes                                  |
|---------------------------------------|-----|----------------------------------------|
| Honeywell rope leak sensor            | 1   | drain pan                              |
| Tank float switch                      | 3   | slurry / clean H₂O / drain tank        |
| Latching mushroom E-stop              | 1   | NC contacts in series with contactor   |
| 24V DC contactor (40A)                | 1   | gates the actuator rail                |
| TPS3823 supervisor IC                 | 1   | on safety MCU                          |
| Mean Well RSP-320-24 power supply     | 1   | main 24V                               |
| 12V / 5V DC-DC buck regulators        | 2   |                                        |

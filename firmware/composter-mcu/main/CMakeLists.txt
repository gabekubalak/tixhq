idf_component_register(
    SRCS "main.c"
         "../../common/cobs.c"
         "../../common/crc16.c"
         "../../common/frame.c"
    INCLUDE_DIRS "." "../../common"
    REQUIRES esp_driver_gpio esp_driver_i2c esp_driver_ledc tinyusb
)

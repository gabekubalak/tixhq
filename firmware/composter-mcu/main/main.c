/* Composter MCU.
 *
 * Drives the grinder motor, heater pad, aeration pump.
 * Reads slurry-tank EC, pH, level, and the internal NTC thermistor.
 * Reports state on USB-CDC; receives advance/dispense commands.
 *
 * The HIGH-LEVEL state machine lives in services/composter-controller/.
 * This firmware is the deterministic actuator + sample loop only.
 */

#include <stdio.h>
#include <string.h>
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "frame.h"

#define SAMPLE_INTERVAL_MS 2000

extern void compost_pins_init(void);
extern void compost_read(char *json, size_t cap);
extern void compost_handle_command(const uint8_t *json, size_t len);

static void compost_task(void *arg) {
    char json[512];
    uint8_t wire[GROVE_FRAME_MAX_WIRE];
    while (1) {
        compost_read(json, sizeof(json));
        size_t n = grove_frame_pack((const uint8_t *)json, strlen(json),
                                    wire, sizeof(wire));
        /* tx via tinyusb_cdcacm_write_queue */
        (void)n; (void)wire;
        vTaskDelay(pdMS_TO_TICKS(SAMPLE_INTERVAL_MS));
    }
}

void app_main(void) {
    compost_pins_init();
    xTaskCreate(compost_task, "compost", 4096, NULL, 5, NULL);
}

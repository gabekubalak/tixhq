/* Safety MCU. Independent of the Jetson and of every other MCU.
 *
 * Owns the 24V actuator contactor relay. Trips on:
 *   - Leak sensor in the drain pan
 *   - Slurry tank thermistor > 65 °C
 *   - Manifold EC > 4.0 mS/cm  (cross-checked against own probe)
 *   - Manifold pH outside [4.5, 8.0]
 *   - Sensor MCU heartbeat loss > 2 s
 *   - Composter MCU heartbeat loss > 2 s
 *   - Latching E-stop input low
 *   - Internal watchdog
 *
 * Once latched, the contactor stays open until BOTH the Jetson sends a
 * signed "ack" frame AND the physical reset button is held for 2 s.
 */

#include <stdint.h>
#include <stdbool.h>
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "esp_log.h"
#include "esp_task_wdt.h"
#include "driver/gpio.h"

#define GPIO_CONTACTOR_RELAY  10
#define GPIO_ESTOP_IN         11
#define GPIO_RESET_BTN        12
#define GPIO_LEAK_SENSOR      13

#define HEARTBEAT_TIMEOUT_MS  2000

extern bool   read_slurry_temp_ok(void);
extern bool   read_ec_ph_ok(void);
extern bool   peer_heartbeat_ok(uint32_t timeout_ms);
extern bool   jetson_ack_received_and_reset_held(void);

static const char *TAG = "safety";
static volatile bool latched = false;

static void trip(const char *cause) {
    gpio_set_level(GPIO_CONTACTOR_RELAY, 0);   /* open = de-energize */
    latched = true;
    ESP_LOGE(TAG, "TRIP: %s", cause);
    /* The Jetson-side mirror publishes grove.event.safety.trip on the bus. */
}

static void safety_task(void *arg) {
    esp_task_wdt_add(NULL);
    while (1) {
        esp_task_wdt_reset();

        if (gpio_get_level(GPIO_ESTOP_IN) == 0)        { trip("estop"); }
        else if (gpio_get_level(GPIO_LEAK_SENSOR) == 1){ trip("leak_pan"); }
        else if (!read_slurry_temp_ok())               { trip("over_temp"); }
        else if (!read_ec_ph_ok())                     { trip("ec_or_ph"); }
        else if (!peer_heartbeat_ok(HEARTBEAT_TIMEOUT_MS)) {
                                                         trip("mcu_heartbeat_loss"); }

        if (latched && jetson_ack_received_and_reset_held()) {
            latched = false;
            gpio_set_level(GPIO_CONTACTOR_RELAY, 1);
            ESP_LOGW(TAG, "rearmed");
        }
        vTaskDelay(pdMS_TO_TICKS(50));
    }
}

void app_main(void) {
    gpio_set_direction(GPIO_CONTACTOR_RELAY, GPIO_MODE_OUTPUT);
    gpio_set_direction(GPIO_ESTOP_IN,       GPIO_MODE_INPUT);
    gpio_set_direction(GPIO_RESET_BTN,      GPIO_MODE_INPUT);
    gpio_set_direction(GPIO_LEAK_SENSOR,    GPIO_MODE_INPUT);

    /* Start de-energized; require a clean self-check before closing. */
    gpio_set_level(GPIO_CONTACTOR_RELAY, 0);

    esp_task_wdt_config_t wdt = { .timeout_ms = 1000, .trigger_panic = true };
    esp_task_wdt_init(&wdt);

    xTaskCreate(safety_task, "safety", 4096, NULL, 10, NULL);
}

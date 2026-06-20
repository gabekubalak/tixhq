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
#include "esp_log.h"
#include "tinyusb.h"
#include "tusb_cdc_acm.h"

#include "frame.h"

static const char *TAG = "composter-mcu";

#define SAMPLE_INTERVAL_MS 2000

extern void compost_pins_init(void);
extern void compost_read(char *json, size_t cap);
extern void compost_handle_command(const uint8_t *json, size_t len);

static void compost_task(void *arg) {
    char json[512];
    uint8_t wire[KRATT_FRAME_MAX_WIRE];
    TickType_t last = xTaskGetTickCount();

    while (1) {
        compost_read(json, sizeof(json));
        size_t n = kratt_frame_pack((const uint8_t *)json, strlen(json),
                                    wire, sizeof(wire));
        if (n > 0) tinyusb_cdcacm_write_queue(TINYUSB_CDC_ACM_0, wire, n);
        tinyusb_cdcacm_write_flush(TINYUSB_CDC_ACM_0, 0);

        vTaskDelayUntil(&last, pdMS_TO_TICKS(SAMPLE_INTERVAL_MS));
    }
}

static void cdc_rx_cb(int itf, cdcacm_event_t *event) {
    static uint8_t buf[KRATT_FRAME_MAX_WIRE];
    static size_t  idx = 0;
    uint8_t chunk[64];
    size_t  got = 0;
    tinyusb_cdcacm_read(itf, chunk, sizeof(chunk), &got);

    for (size_t i = 0; i < got; i++) {
        if (chunk[i] == 0x00) {
            uint8_t payload[KRATT_FRAME_MAX_PAYLOAD];
            size_t  pl = kratt_frame_unpack(buf, idx, payload, sizeof(payload));
            if (pl != (size_t)-1) compost_handle_command(payload, pl);
            else ESP_LOGW(TAG, "frame drop (crc/cobs)");
            idx = 0;
        } else if (idx < sizeof(buf)) {
            buf[idx++] = chunk[i];
        } else {
            idx = 0;
        }
    }
}

void app_main(void) {
    compost_pins_init();

    tinyusb_config_t usbcfg = { 0 };
    ESP_ERROR_CHECK(tinyusb_driver_install(&usbcfg));

    tinyusb_config_cdcacm_t cdc = {
        .usb_dev      = TINYUSB_USBDEV_0,
        .cdc_port     = TINYUSB_CDC_ACM_0,
        .callback_rx  = &cdc_rx_cb,
    };
    ESP_ERROR_CHECK(tusb_cdc_acm_init(&cdc));

    xTaskCreate(compost_task, "compost", 4096, NULL, 5, NULL);
}

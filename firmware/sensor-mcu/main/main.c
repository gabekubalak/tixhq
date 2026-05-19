/* Sensor MCU. One per rack.
 * Samples per-shelf moisture + SHT41 temp/humidity, manifold EC/pH/flow,
 * publishes COBS+CRC framed JSON over USB-CDC to the Jetson.
 * Receives valve / light / dose commands and drives the corresponding pins.
 */

#include <stdio.h>
#include <string.h>

#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "esp_log.h"
#include "tinyusb.h"
#include "tusb_cdc_acm.h"

#include "frame.h"

static const char *TAG = "sensor-mcu";

#define SAMPLE_INTERVAL_MS 1000
#define HEARTBEAT_MS       500

extern void sensors_init(void);
extern void sensors_sample(char *json_buf, size_t cap);
extern void actuators_init(void);
extern void actuators_handle_command(const uint8_t *json, size_t len);

static void sample_task(void *arg) {
    char  json[1024];
    uint8_t wire[GROVE_FRAME_MAX_WIRE];
    TickType_t last = xTaskGetTickCount();

    while (1) {
        sensors_sample(json, sizeof(json));
        size_t n = grove_frame_pack((const uint8_t *)json, strlen(json),
                                    wire, sizeof(wire));
        if (n > 0) tinyusb_cdcacm_write_queue(TINYUSB_CDC_ACM_0, wire, n);
        tinyusb_cdcacm_write_flush(TINYUSB_CDC_ACM_0, 0);

        vTaskDelayUntil(&last, pdMS_TO_TICKS(SAMPLE_INTERVAL_MS));
    }
}

static void cdc_rx_cb(int itf, cdcacm_event_t *event) {
    static uint8_t  buf[GROVE_FRAME_MAX_WIRE];
    static size_t   idx = 0;
    uint8_t chunk[64];
    size_t  got = 0;
    tinyusb_cdcacm_read(itf, chunk, sizeof(chunk), &got);

    for (size_t i = 0; i < got; i++) {
        if (chunk[i] == 0x00) {
            uint8_t payload[GROVE_FRAME_MAX_PAYLOAD];
            size_t  pl = grove_frame_unpack(buf, idx, payload, sizeof(payload));
            if (pl != (size_t)-1) actuators_handle_command(payload, pl);
            else ESP_LOGW(TAG, "frame drop (crc/cobs)");
            idx = 0;
        } else if (idx < sizeof(buf)) {
            buf[idx++] = chunk[i];
        } else {
            idx = 0;  /* overflow, resync on next sentinel */
        }
    }
}

void app_main(void) {
    sensors_init();
    actuators_init();

    tinyusb_config_t usbcfg = { 0 };
    ESP_ERROR_CHECK(tinyusb_driver_install(&usbcfg));

    tinyusb_config_cdcacm_t cdc = {
        .usb_dev      = TINYUSB_USBDEV_0,
        .cdc_port     = TINYUSB_CDC_ACM_0,
        .callback_rx  = &cdc_rx_cb,
    };
    ESP_ERROR_CHECK(tusb_cdc_acm_init(&cdc));

    xTaskCreate(sample_task, "sample", 4096, NULL, 5, NULL);
}

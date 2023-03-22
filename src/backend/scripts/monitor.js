const jwt = require("jsonwebtoken");
const mqtt = require("mqtt");
const raspi = require("raspi");
const gpio = require("raspi-gpio");
const sensor = require("node-dht-sensor");
const { inbox, sendMail } = require("./email");

/**
 * Start MQTT Client Monitor
 */
const monitor = function () {
  raspi.init(() => {
    // TODO: Monitor Function Connecting to MQTT Broker
    const adminToken = jwt.sign({ user_id: 1 }, process.env.SECRET);

    const options = {
      host: process.env.MQTT_HOST,
      port: process.env.MQTT_PORT,
      username: adminToken,
      password: "any",
    };

    const client = mqtt.connect(options);

    client.on("connect", () => {
      console.log("Connected to MQTT Broker");

      client.subscribe("safehouse/light");
      client.subscribe("safehouse/fan");

      client.on("message", (topic, message) => {
        switch (topic) {
          case "safehouse/light":
            const output = new gpio.DigitalOutput(process.env.LIGHT_PIN);

            if (message.includes("1")) {
              output.write(gpio.HIGH);
            } else if (message.includes("0")) {
              output.write(gpio.LOW);
            }

            break;
          case "safehouse/fan":
            const enable = new gpio.DigitalOutput(process.env.MOTOR_ENABLE_PIN);
            const inOne = new gpio.DigitalOutput(process.env.MOTOR_IN_ONE_PIN);
            const inTwo = new gpio.DigitalOutput(process.env.MOTOR_IN_TWO_PIN);

            if (message.includes("1")) {
              enable.write(gpio.HIGH);
              inOne.write(gpio.HIGH);
              // inTwo.write(gpio.HIGH);
            } else if (message.includes("0")) {
              enable.write(gpio.LOW);
            }
          default:
            break;
        }
      });
    });

    let canSendMail = true;

    setInterval(() => {
      sensor.read(11, 20, function(err, temperature, humidity) {
        if (!err) {
          console.log(`temp: ${temperature}°C, humidity: ${humidity}%`);
          client.publish("safehouse/temperature", temperature.toString());
          client.publish("safehouse/humidity", humidity.toString());

          if (temperature > 20 && canSendMail) {
            console.log("canSendMail: " + canSendMail.toString());
            canSendMail = false;

            sendMail("davidanotrudeau@gmail.com", "Safehouse Alert: Temperature", `The current temperature is ${temperature}°C. Would you like to turn on the fan?`);

            setTimeout(() => {
              canSendMail = true;
            }, 30000);
          } else {
            console.log("canSendMail: " + canSendMail.toString());
          }
        }
      });
    }, 3000);

    inbox((text) => {
      if (text.includes("yes")) {
        client.publish("safehouse/fan", "1");
      }
    });
  });
};

// Exports
module.exports = monitor;

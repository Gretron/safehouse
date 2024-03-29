const jwt = require("jsonwebtoken");
const mqtt = require("mqtt");
const raspi = require("raspi");
const gpio = require("raspi-gpio");
const sensor = require("node-dht-sensor");
const { inbox, sendMail } = require("./email");
const User = require("../models/userModel");

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

    global.mqttClient = client;
    global.user = {
      user_id: 0,
      temperature_threshold: 25,
      light_intensity_threshold: 400,
    };

    const initialThresholds = { temperature_threshold: global.user.temperature_threshold, light_intensity_threshold: global.user.light_intensity_threshold };
    client.publish("safehouse/thresholds", JSON.stringify(initialThresholds), { retain: true });

    client.on("connect", () => {
      console.log("Connected to MQTT Broker");

      client.subscribe("safehouse/light");
      client.subscribe("safehouse/fan");
      client.subscribe("safehouse/rfid");
      client.subscribe("safehouse/light-intensity");

      client.publish("safehouse/light", "0", { retain: true });
      client.publish("safehouse/fan", "0", { retain: true });

      global.checkLightIntensity = true;
      global.lightState = 0;

      client.on("message", async (topic, message) => {
        switch (topic) {
          case "safehouse/light":
            const output = new gpio.DigitalOutput(process.env.LIGHT_PIN);

            if (message.includes("1")) {
              output.write(gpio.HIGH);
              global.lightState = 1;
            } else if (message.includes("0")) {
              output.write(gpio.LOW);
              global.lightState = 0;
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

            break;
          case "safehouse/light-intensity":
            if (
              parseInt(message) < global.user.light_intensity_threshold &&
              global.lightState == 0
            ) {
              const today = new Date();

              if (global.checkLightIntensity) {
                sendMail(
                  "davidanotrudeau@gmail.com",
                  "Safehouse Alert: Light",
                  `The Light is ON at ${("0" + today.getHours()).slice(-2)}:${("0" + today.getMinutes()).slice(-2)}`
                );
              }

              client.publish("safehouse/notification", "Email has been sent.");
              client.publish("safehouse/light", "1", { retain: true });

              global.checkLightIntensity = false;

              setTimeout(() => {
                global.checkLightIntensity = true;
              }, 10000);
            } else if ((parseInt(message) > 400) & (global.lightState == 1)) {
              client.publish("safehouse/light", "0", { retain: true });
            }

            break;
          case "safehouse/rfid":
            const user = await User.tagExists(message.toString().trim());

            console.log(user);
            console.log(message);

            if (user && global.user.user_id != user.user_id) {
              changeThresholds(user);
            }

            break;
          default:
            break;
        }
      });
    });

    let canSendMail = true;

    setInterval(() => {
      sensor.read(11, 26, function (err, temperature, humidity) {
        if (!err) {
          console.log(`temp: ${temperature}°C, humidity: ${humidity}%`);
          client.publish("safehouse/temperature", temperature.toString());
          client.publish("safehouse/humidity", humidity.toString());

          if (temperature > global.user.temperature_threshold && canSendMail) {
            console.log("canSendMail: " + canSendMail.toString());
            canSendMail = false;

            sendMail(
              "davidanotrudeau@gmail.com",
              "Safehouse Alert: Temperature",
              `The current temperature is ${temperature}°C. Would you like to turn on the fan?`
            );

            setTimeout(() => {
              canSendMail = true;
            }, 30000);
          } else {
            console.log("canSendMail: " + canSendMail.toString());
          }
        }
      });
    }, 5000);

    inbox((text) => {
      if (text.toLowerCase().includes("yes")) {
        client.publish("safehouse/fan", "1", { retain: true });
      }
    });
  });
};

function changeThresholds(user) {
  console.log(user);

  global.user = user;

  const today = new Date();

  sendMail(
    "davidanotrudeau@gmail.com",
    "Safehouse Alert: User",
    `User ${user.user_email} entered at ${("0" + today.getHours()).slice(-2)}:${("0" + today.getMinutes()).slice(-2)}`
  );

  const thresholds = {
    user_email: user.user_email,
    temperature_threshold: user.temperature_threshold,
    light_intensity_threshold: user.light_intensity_threshold,
  };

  global.mqttClient.publish(
    "safehouse/notification",
    user.user_email + " has checked in."
  );
  global.mqttClient.publish(
    "safehouse/thresholds",
    JSON.stringify(thresholds),
    { retain: true }
  );

  console.log(user.user_email + " has checked in.");
}

// Exports
module.exports = { monitor, changeThresholds };

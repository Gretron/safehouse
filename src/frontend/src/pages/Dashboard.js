// Styles
import dashboard from "../assets/css/dashboard.css";

// Components
import GaugeChart from "react-gauge-chart";
import { useMqttContext } from "../hooks/useMqttContext";
import { useState, useRef } from "react";
import { useMqtt } from "../hooks/useMqtt";
import { useAuthContext } from "../hooks/useAuthContext";

import { ReactComponent as Light } from "../assets/img/light.svg";

import { ReactComponent as LightOn } from "../assets/img/light-on.svg";
import { ReactComponent as LightOff } from "../assets/img/light-off.svg";

import { ReactComponent as FanOn } from "../assets/img/fan-on.svg";
import { ReactComponent as FanOff } from "../assets/img/fan-off.svg";

import { ReactComponent as LightBulbOn } from "../assets/img/light-bulb-on.svg";
import { ReactComponent as LightBulbOff } from "../assets/img/light-bulb-off.svg";


/**
 * Dashboard Page
 */
const Dashboard = () => {
  const { user } = useAuthContext();
  const { connect } = useMqtt();
  const { humidity, temperature } = useMqttContext();
  const loaded = useRef(false);

  useState(() => {
    if (loaded.current) return;

    loaded.current = true;

    console.log("renders");

    connect(user);
  }, []);

  return (
    <div className="dashboard">
      <LightWidget />
      <FanWidget />
      <div className="gaugeChart">
        <GaugeChart
          id="gauge--1"
          animate={false}
          percent={Number(humidity) / 100}
          nrOfLevels={1}
          colors={["#3477eb"]}
        />
        <GaugeChart
          id="gauge--2"
          animate={false}
          percent={Number(temperature) / 100}
          formatTextValue={(value) => value + "°C"}
          nrOfLevels={16}
        />
      </div>
      <LightIntensity />
    </div>
  );
};

/**
 * Widget for Light Electrical Component
 */
const LightWidget = () => {
  const { client, light } = useMqttContext();

  const handleClick = async () => {
    client.publish(
      "safehouse/light",
      light ? (light == "1" ? "0" : "1") : "1",
      0,
      true
    );
  };

  return (
    <div className="light-widget">
      <button
        className={light == "1" ? "light-widget--active" : ""}
        style={{ aspectRatio: "1 / 1", width: "10rem" }}
        onClick={() => handleClick()}
      >
        {light == 1 ? <LightOn /> : <LightOff />}
      </button>
    </div>
  );
};

const FanWidget = () => {
  const { client, fan } = useMqttContext();

  const handleClick = async () => {
    client.publish(
      "safehouse/fan",
      fan ? (fan == "1" ? "0" : "1") : "1",
      0,
      true
    );
  };

  return (
    <div className="light-widget">
      <button
        className={fan == "1" ? "light-widget--active" : ""}
        style={{ aspectRatio: "1 / 1", width: "10rem" }}
        onClick={() => handleClick()}
      >
        {fan == 1 ? <FanOn /> : <FanOff />}
      </button>
    </div>
  );
};


/**
 * Widget for Light Intensity
 */
const LightIntensity = () => {
  const {intensity} = "500";
  return (
    <div className="light-intensity-widget">
      <LightBulbOn id="light-bulb" />
      <input
        id="slider"
        type="range"
        min="0"
        max="1000"
        value={intensity}
      />
      <span>550</span>
      {/* <span>{intensity}</span> */}
    </div>
  );
};


export default Dashboard;

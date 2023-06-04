import React from "react";
import Nav from "react-bootstrap/Nav";
import Navbar from "react-bootstrap/Navbar";

import { Link, useParams } from "react-router-dom";
import accountIcon from "bootstrap-icons/icons/person-circle.svg";
import likesIcon from "bootstrap-icons/icons/heart.svg";
import organisationsIcon from "bootstrap-icons/icons/building.svg";
import projectsIcon from "bootstrap-icons/icons/list-task.svg";
import scheduleIcon from "bootstrap-icons/icons/calendar.svg";
import eventIcon from "bootstrap-icons/icons/calendar-event.svg";
import userIcon from "bootstrap-icons/icons/people.svg";
import overrideUserIcon from "bootstrap-icons/icons/person.svg";
import logoutIcon from "bootstrap-icons/icons/box-arrow-left.svg";

import "./navbar.scss";
import api from "../../api";

function CustomNavbar(props) {
  const params = useParams();
  const type = api.getApiTokenData().type;

  return (
    <Navbar className="ps-2 pe-2 p-md-0" bg="primary" expand="sm">
      <Navbar.Brand className="d-md-none">
        <Link to={`/${params.evid || ""}`}>
          <img
            src="/images/uvalogo.svg"
            width="64"
            height="64"
            alt="UvA Logo"
          />
        </Link>
      </Navbar.Brand>
      <Navbar.Toggle aria-controls="topNavbar" />
      <Navbar.Collapse id="topNavbar" className="justify-content-end">
        <Nav className="sidebar navbar flex-row flex-md-column justify-content-start">
          <Link className="logo d-none d-md-block" to={`/${params.evid || ""}`}>
            <img
              src="/images/uvalogo.svg"
              width="64"
              height="64"
              alt="UvA Logo"
            />
          </Link>

          {type === "a" ? (
            <>
              <Nav.Item>
                <Link to={`/account`}>
                  <img src={accountIcon} alt="" />
                  <span>Account</span>
                </Link>
              </Nav.Item>
              <Nav.Item>
                <Link to={`/`}>
                  <img src={eventIcon} alt="" />
                  <span>Events</span>
                </Link>
              </Nav.Item>
              <Nav.Item>
                <Link to={`/students`}>
                  <img src={userIcon} alt="" />
                  <span>Students</span>
                </Link>
              </Nav.Item>
              <Nav.Item>
                <Link to={`/loginAs`}>
                  <img src={overrideUserIcon} alt="" />
                  <span>LoginAs</span>
                </Link>
              </Nav.Item>
              <Nav.Item>
                <Link to={`/testing`}>
                  <img src={overrideUserIcon} alt="" />
                  <span>Testing</span>
                </Link>
              </Nav.Item>
              <Nav.Item>
                <Link to={`/register`}>
                  <img src={overrideUserIcon} alt="" />
                  <span>Register</span>
                </Link>
              </Nav.Item>
            </>
          ) : null}
          {type === "s" ? (
            <>
              <Nav.Item>
                <Link to={`/${params.evid}/account`}>
                  <img src={accountIcon} alt="" />
                  <span>Account</span>
                </Link>
              </Nav.Item>
              <Nav.Item>
                <Link to={`/${params.evid}/event`}>
                  <img src={eventIcon} alt="" />
                  <span>Event</span>
                </Link>
              </Nav.Item>
              <Nav.Item>
                <Link to={`/${params.evid}/schedule`}>
                  <img src={scheduleIcon} alt="" />
                  <span>Schedule</span>
                </Link>
              </Nav.Item>
              <Nav.Item>
                <Link to={`/${params.evid}/organisations`}>
                  <img src={organisationsIcon} alt="" />
                  <span>Orgs</span>
                </Link>
              </Nav.Item>
              <Nav.Item>
                <Link to={`/${params.evid}/votes`}>
                  <img src={likesIcon} alt="" />
                  <span>Votes</span>
                </Link>
              </Nav.Item>
            </>
          ) : null}

          {type === "r" ? (
            <>
              <Nav.Item>
                <Link to={`/${params.evid}/account`}>
                  <img src={accountIcon} alt="" />
                  <span>Account</span>
                </Link>
              </Nav.Item>
              {api.getApiTokenData().repAdmin === true ? (
                <Nav.Item>
                  <Link to={`/${params.evid}/organisation`}>
                    <img src={organisationsIcon} alt="" />
                    <span>Organisation</span>
                  </Link>
                </Nav.Item>
              ) : null}
              <Nav.Item>
                <Link to={`/${params.evid}/event`}>
                  <img src={eventIcon} alt="" />
                  <span>Event</span>
                </Link>
              </Nav.Item>
              <Nav.Item>
                <Link to={`/${params.evid}/schedule`}>
                  <img src={scheduleIcon} alt="" />
                  <span>Schedule</span>
                </Link>
              </Nav.Item>
              <Nav.Item>
                <Link to={`/${params.evid}/projects`}>
                  <img src={projectsIcon} alt="" />
                  <span>Projects</span>
                </Link>
              </Nav.Item>
            </>
          ) : null}

          <Nav.Item className="logout">
            <div
              onClick={
                api.apiTokenOverriden()
                  ? () => {
                      api.overrideApiTokenData(null);
                      window.location.href = "/loginAs";
                    }
                  : api.user.logout
              }
            >
              <img src={logoutIcon} alt="" />
              <span>{api.apiTokenOverriden() ? "Return" : "Logout"}</span>
            </div>
          </Nav.Item>
        </Nav>
      </Navbar.Collapse>
    </Navbar>
  );
}

export default CustomNavbar;

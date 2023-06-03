import React, { useState } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  useParams,
  Outlet,
  Navigate,
} from "react-router-dom";

import api from "./api";

import LoginPage from "./pages/LoginPage";
import Testing from "./pages/Testing";
import NotFound from "./pages/NotFound";
import EventPicker from "./pages/EventPicker";

import Page from "./pages/Page";
import EventPage from "./pages/EventPage";
import Error from "./pages/Error";

import Event from "./pages/admin/Event";
import EventEntities from "./pages/admin/EventEntities";
import EventSchedule from "./pages/admin/EventSchedule";
import EventProjects from "./pages/admin/EventProjects";
import Events from "./pages/admin/Events";
import Students from "./pages/admin/Students";
import AdminAccount from "./pages/admin/AdminAccount";
import LoginAs from "./pages/admin/LoginAs";

import StudentAccount from "./pages/student/StudentAccount";
import Organisations from "./pages/student/Organisations";
import Votes from "./pages/student/Votes";
import StudentSchedule from "./pages/student/Schedule";

import RepAccount from "./pages/representative/RepAccount";
import Projects from "./pages/representative/projects";
import RepSchedule from "./pages/representative/Schedule";

import OrganisationDashboard from "./pages/adminRepresentative/OrganisationDashboard";

function EventChecker(props) {
  const params = useParams();
  const [found, setFound] = useState(true);
  const [redirect, setRedirect] = useState(false);

  api.event
    .get(params.evid)
    .exec()
    .then((event) => {
      setFound(!!event);
    })
    .catch(() => {
      setFound(false);
    });

  if (!found) {
    setTimeout(() => setRedirect(true), 3000);

    if (redirect) {
      return <Navigate to="/events" />;
    }
  }

  return found ? (
    <Outlet />
  ) : (
    <div className="d-flex mt-4 justify-content-center">
      <div>
        <h1>Event not found :(</h1>
        You will be redirected after 3 seconds, or you can{" "}
        <a href="/events">click here</a>.
      </div>
    </div>
  );
}

class App extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      tokenData: api.getApiTokenData(),
    };
    api.setTokenChangeCallback(this.onTokenChange);
  }

  onTokenChange = (tokenData) => {
    this.setState({ tokenData });
  };

  guestRoutes() {
    return (
      <>
        <Route path="*" element={<LoginPage />} />
      </>
    );
  }

  adminRoutes() {
    return (
      <>
        <Route path="account" element={<Page page={<AdminAccount />} />} />
        <Route path="event/:evid/" element={<Page page={<Event />} />} />
        <Route
          path="event/:evid/entities"
          element={<Page page={<EventEntities />} />}
        />
        <Route
          path="event/:evid/schedule"
          element={<Page page={<EventSchedule />} />}
        />
        <Route
          path="event/:evid/projects"
          element={<Page page={<EventProjects />} />}
        />
        <Route path="students" element={<Page page={<Students />} />} />
        <Route path="loginAs" element={<Page page={<LoginAs />} />} />
        <Route path="testing" element={<Page page={<Testing />} />} />
        <Route path="" element={<Page page={<Events />} />} />
      </>
    );
  }

  studentRoutes() {
    return (
      <>
        <Route path="" element={<Navigate to="account" replace={true} />} />
        <Route path="account" element={<Page page={<StudentAccount />} />} />
        <Route
          path="organisations"
          element={<Page page={<Organisations />} />}
        />
        <Route path="votes" element={<Page page={<Votes />} />} />
        <Route path="schedule" element={<Page page={<StudentSchedule />} />} />
      </>
    );
  }

  repRoutes() {
    return (
      <>
        <Route path="" element={<Navigate to="account" replace={true} />} />
        <Route path="account" element={<Page page={<RepAccount />} />} />
        <Route path="projects" element={<Page page={<Projects />} />} />
        <Route path="schedule" element={<Page page={<RepSchedule />} />} />
      </>
    );
  }

  adminRepRoutes() {
    return (
      <>
        <Route
          path=""
          element={<Navigate to="organisation" replace={true} />}
        />
        <Route
          path="organisation"
          element={<Page page={<OrganisationDashboard />} />}
        />
        {this.repRoutes()}
      </>
    );
  }

  getRoutes() {
    const tokenData = api.getApiTokenData();
    if (!tokenData) {
      return this.guestRoutes();
    }

    let routes;
    switch (tokenData.type) {
      case "a": // Admin
        return this.adminRoutes();
      case "s": // Student
        routes = this.studentRoutes();
        break;
      case "r": // Representative
        routes = tokenData.repAdmin ? this.adminRepRoutes() : this.repRoutes();
        break;

      default:
        console.error("Role undefined");
        return [];
    }

    return (
      <>
        <Route path="/" element={<EventPicker />} />
        <Route path="/events" element={<EventPicker />} />
        <Route path="/:evid" element={<EventChecker />}>
          <Route path="event" element={<Page page={<EventPage />} />} />
          {routes}
        </Route>
      </>
    );
  }

  render() {
    return (
      <BrowserRouter>
        <Routes>
          <Route path="/error" element={<Error />} />
          {this.getRoutes()}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    );
  }
}

export default App;

import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, useParams, Outlet } from "react-router-dom";

import api from './api';

import LoginPage from './pages/LoginPage';
import NotFound from './pages/NotFound';
import EventPicker from './pages/EventPicker';

import Page from './pages/Page';

import StudentHome from './pages/student/StudentHome';
import Organisations from './pages/student/Organisations';
import Votes from './pages/student/Votes';

import Account from './pages/representative/account';

function EventChecker(props) {
  const params = useParams();
  const [found, setFound] = useState(true);

  api.event.get(params.evid).exec().then((event) => {
    setFound(!!event);
  }).catch(() => {
    setFound(false);
  });


  return found ? <Outlet /> : 'Event not found!';
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
  }

  guestRoutes() {
    return (
      <>
        <Route path="*" element={<LoginPage />} />
      </>
    );
  }

  adminRoutes() {
    return [];
  }

  studentRoutes() {
    return (
      <>
        <Route path='dashboard' element={<Page page={<StudentHome />} />} />
        <Route path='organisations' element={<Page page={<Organisations />} />} />
        <Route path='votes' element={<Page page={<Votes />} />} />
      </>
    );
  }

  repRoutes() {
    return (
      <>
        <Route path="account" element={<Page page={<Account />} />} />
      </>
    );
  }

  adminRepRoutes() {
    return [];
  }

  getRoutes() {
    const tokenData = api.getApiTokenData();
    if (!tokenData) {
      return this.guestRoutes();
    }

    let routes;
    switch (tokenData.type) {
      case 'a': // Admin
        routes = this.adminRoutes();
        break;
      case 's': // Student
        routes = this.studentRoutes();
        break;
      case 'r': // Representative
        routes = tokenData.repAdmin ? this.adminRepRoutes() : this.repRoutes();
        break;

      default:
        console.error('Role undefined');
        return []
    }

    return (
      <>
        <Route path="/" element={<EventPicker />} />
        <Route path="/events" element={<EventPicker />} />
        <Route path="/:evid" element={<EventChecker />}>
          {routes}
        </Route>
      </>
    )
  }

  render() {
    return (
      <BrowserRouter>
        <Routes>
          {this.getRoutes()}
          <Route path='*' element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    )
  }
}

export default App;

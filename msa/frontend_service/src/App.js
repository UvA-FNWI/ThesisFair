import React from 'react';
import { BrowserRouter, Routes, Route } from "react-router-dom";

import api from './api';

import LoginPage from './pages/LoginPage';
import NotFound from './pages/NotFound';

class App extends React.Component {
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
    return [];
  }

  repRoutes() {
    return [];
  }

  adminRepRoutes() {
    return [];
  }

  getRoutes() {
    const tokenData = api.getApiTokenData();
    if (!tokenData) {
      return this.guestRoutes();
    }

    switch (tokenData.type) {
      case 'a': // Admin
        return this.adminRoutes();
      case 's': // Student
        return this.studentRoutes();
      case 'r': // Representative
        if (tokenData.repAdmin) {
          return this.adminRepRoutes();
        }

        return this.repRoutes();

      default:
        console.error('Role undefined');
        return []
    }
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

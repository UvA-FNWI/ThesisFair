import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'

import api from './api'

import LoginPage from './pages/LoginPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import Testing from './pages/Testing'
import Register from './pages/Register'

import Page from './pages/Page'
import EventsPage from './pages/EventsPage'
import EventPage from './pages/EventPage'
import Error from './pages/Error'

import Event from './pages/admin/Event'
import EventEntities from './pages/admin/EventEntities'
import EventProjects from './pages/admin/EventProjects'
import Events from './pages/admin/Events'
import Students from './pages/admin/Students'
import AdminAccount from './pages/admin/AdminAccount'
import LoginAs from './pages/admin/LoginAs'

import StudentAccount from './pages/student/StudentAccount'
import Organisations from './pages/student/Organisations'
import Votes from './pages/student/Votes'

import RepAccount from './pages/representative/RepAccount'
import Projects from './pages/representative/projects'

import OrganisationDashboard from './pages/adminRepresentative/OrganisationDashboard'

class App extends React.Component {
  constructor(props) {
    super(props)

    this.state = {
      tokenData: api.getApiTokenData(),
    }
    api.setTokenChangeCallback(this.onTokenChange)
  }

  onTokenChange = tokenData => {
    this.setState({ tokenData })
  }

  guestRoutes() {
    return (
      <>
        <Route path='forgotPassword' element={<ForgotPasswordPage />} />
        <Route path='resetPassword' element={<ForgotPasswordPage unknownPassword={true} />} />
        <Route path='' element={<LoginPage />} />
      </>
    )
  }

  adminRoutes() {
    return (
      <>
        <Route path='account' element={<Page page={<AdminAccount />} />} />
        <Route path='event/:evid/' element={<Page page={<Event />} />} />
        <Route path='event/:evid/entities' element={<Page page={<EventEntities />} />} />
        <Route path='event/:evid/projects' element={<Page page={<EventProjects />} />} />
        <Route path='students' element={<Page page={<Students />} />} />
        <Route path='loginAs' element={<Page page={<LoginAs />} />} />
        <Route path='testing' element={<Page page={<Testing />} />} />
        <Route path='register' element={<Page page={<Register />} />} />
        <Route path='' element={<Page page={<Events />} />} />
      </>
    )
  }

  studentRoutes() {
    return (
      <>
        <Route path='' element={<Navigate to='account' replace={true} />} />
        <Route path='account' element={<Page page={<StudentAccount />} />} />
        <Route path='organisations' element={<Page page={<Organisations />} />} />
        <Route path='votes' element={<Page page={<Votes />} />} />
      </>
    )
  }

  repRoutes() {
    return (
      <>
        <Route path='' element={<Navigate to='account' replace={true} />} />
        <Route path='account' element={<Page page={<RepAccount />} />} />
        <Route path='projects' element={<Page page={<Projects />} />} />
      </>
    )
  }

  adminRepRoutes() {
    return (
      <>
        <Route path='' element={<Navigate to='organisation' replace={true} />} />
        <Route path='organisation' element={<Page page={<OrganisationDashboard />} />} />
        {this.repRoutes()}
      </>
    )
  }

  getRoutes() {
    const tokenData = api.getApiTokenData()

    if (!tokenData) {
      return this.guestRoutes()
    }

    let routes
    switch (tokenData.type) {
      case 'a': // Admin
        return this.adminRoutes()
      case 's': // Student
        routes = this.studentRoutes()
        break
      case 'r': // Representative
        routes = tokenData.repAdmin ? this.adminRepRoutes() : this.repRoutes()
        break

      default:
        console.error('Role undefined')
        return []
    }

    return (
      <>
        <Route path='/' element={<Navigate to='account' replace={true} />} />
        <Route path='event' element={<Page page={<EventsPage />} />} />
        <Route path='event/:evid/' element={<Page page={<EventPage />} />} />
        {routes}
      </>
    )
  }

  render() {
    return (
      <BrowserRouter>
        <Routes>
          <Route path='/error' element={<Error />} />
          {this.getRoutes()}
          {/* Instead of showing 404, navigate to / */}
          {/* <Route path='*' element={<NotFound />} /> */}
          <Route path='*' element={<Navigate to='/' replace={true} />} />
        </Routes>
      </BrowserRouter>
    )
  }
}

export default App

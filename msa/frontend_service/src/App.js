import React from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import AdminAccount from './pages/admin/AdminAccount'
import EditEvent from './pages/admin/EditEvent'
import LoginAs from './pages/admin/LoginAs'
import AdminOrganisations from './pages/admin/Organisations'
import ProjectReview from './pages/admin/ProjectReview.js'
import AdminProjects from './pages/admin/projects'
import Students from './pages/admin/Students'
import RepStudents from './pages/representative/Students'
import Event from './pages/common/Event'
import Events from './pages/common/Events'
import Marketplace from './pages/common/marketplace'
import Error from './pages/Error'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import LoginPage from './pages/LoginPage'
import Page from './pages/Page'
import OrganisationDashboard from './pages/representative/OrganisationDashboard'
import Projects from './pages/representative/projects'
import ProjectEditor from './pages/representative/projectEditor'
import RepAccount from './pages/representative/RepAccount'
import Organisations from './pages/student/Organisations'
import StudentAccount from './pages/student/StudentAccount'
import Votes from './pages/student/Votes'
import api from './api'
import * as session from './session'

class App extends React.Component {
  constructor(props) {
    super(props)

    this.state = {
      tokenData: api.getApiTokenData(),
      isAcademic: false,
    }
    api.setTokenChangeCallback(this.onTokenChange)
  }

  async componentDidMount() {
    if (!api.getApiTokenData()) {
      this.setState({ isGuest: true })
    } else if (api.getApiTokenData().type === 'r') {
      const entity = await api.entity.get(session.getEnid()).exec()

      this.setState({ isAcademic: entity.grantsAcademicRights })
    }
  }

  onTokenChange = tokenData => {
    this.setState({ tokenData })
  }

  guestRoutes() {
    return (
      <>
        <Route path='/forgotPassword' element={<ForgotPasswordPage />} />
        <Route path='/resetPassword' element={<ForgotPasswordPage unknownPassword={true} />} />
        <Route path='' element={<LoginPage />} />
        <Route path='/marketplace' element={<Marketplace />} />
      </>
    )
  }

  adminRoutes() {
    return (
      <>
        <Route path='/account' element={<Page page={<AdminAccount />} />} />
        <Route path='/organisations' element={<Page page={<AdminOrganisations />} />} />
        <Route path='/organisation/create/' element={<Page page={<OrganisationDashboard />} />} />
        <Route path='/organisation/:enid/' element={<Page page={<OrganisationDashboard />} />} />
        <Route path='/organisation/:enid/edit' element={<Page page={<OrganisationDashboard />} />} />
        <Route path='/event/create/' element={<Page page={<EditEvent />} />} />
        <Route path='/event/:evid/edit/' element={<Page page={<EditEvent />} />} />
        {/*<Route path='event/:evid/projects' element={<Page page={<EventProjects />} />} />*/}
        <Route path='/projects' element={<Page page={<AdminProjects />} />} />
        <Route path='/project/:pid/review' element={<Page page={<ProjectReview />} />} />
        <Route path='/project/:pid/edit' element={<Page page={<ProjectEditor onClose={() => window.location.href = '/projects'} />} />} />
        <Route path='/students' element={<Page page={<Students />} />} />
        <Route path='/loginAs' element={<Page page={<LoginAs />} />} />
        <Route path='/marketplace' element={<Page page={<Marketplace />} />} />
        <Route path='' element={<Page page={<Events />} />} />
      </>
    )
  }

  studentRoutes() {
    return (
      <>
        <Route path='' element={<Navigate to='/account' replace={true} />} />
        <Route path='/account' element={<Page page={<StudentAccount />} />} />
        <Route path='/organisations' element={<Page page={<Organisations />} />} />
        {/* <Route path='/organisation/:enid/' element={<Page page={<OrganisationDashboard />} />} /> */}
        <Route path='/votes' element={<Page page={<Votes />} />} />
        <Route path='/marketplace' element={<Page page={<Marketplace isStudent={true} />} />} />
      </>
    )
  }

  repRoutes() {
    return (
      <>
        <Route path='' element={<Navigate to='/account' replace={true} />} />
        <Route path='/account' element={<Page page={<RepAccount />} />} />
        <Route
          path='/projects'
          element={
            this.state.isAcademic ? <Page page={<AdminProjects isAcademic={true} />} /> : <Page page={<Projects />} />
          }
        />
        <Route
          path='/project/:pid/review'
          element={this.state.isAcademic ? <Page page={<ProjectReview />} /> : <Page page={<Projects />} />}
        />
        <Route
          path='/students'
          element={<Page page={<RepStudents />} />}
        />
      </>
    )
  }

  adminRepRoutes() {
    return (
      <>
        <Route path='' element={<Navigate to='/organisations' replace={true} />} />
        <Route path='/organisation' element={<Page page={<OrganisationDashboard />} />} />
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
        <Route path='/' element={<Navigate to='/account' replace={true} />} />
        <Route path='/events' element={<Page page={<Events />} />} />
        <Route path='/event/:evid/' element={<Page page={<Event />} />} />
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
          <Route path='*' element={<Navigate to='/' replace={true} />} />
        </Routes>
      </BrowserRouter>
    )
  }
}

export default App

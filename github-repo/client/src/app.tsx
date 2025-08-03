import { Switch, Route } from 'wouter';
import ClientDetail from './pages/admin/client/[id]';
// ... other imports

function App() {
  return (
    <Switch>
      {/* ... other routes */}
      <Route path="/admin/client/:id" component={ClientDetail} />
      <Route path="/admin/clients/:id" component={ClientDetail} />
      {/* ... other routes */}
    </Switch>
  );
}

export default App;
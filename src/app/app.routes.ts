import { Routes } from '@angular/router';
import { CRUD } from './components/crud.component';
import { AppComponent } from './components/app.component';
import { Home } from './components/home.component';

export const routes: Routes = [
    { path: '', redirectTo: 'home', pathMatch: 'full'},
    { path: 'home', component: Home},
    { path: 'appComponent', component: AppComponent},
    { path: 'crud', component: CRUD}
];
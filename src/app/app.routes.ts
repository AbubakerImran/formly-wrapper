import { Routes } from '@angular/router';
import { CRUD } from './components/crud.component';
import { AppComponent } from './components/app.component';

export const routes: Routes = [
    { path: '', redirectTo: 'appComponent', pathMatch: 'full' },
    { path: 'appComponent', component: AppComponent},
    { path: 'crud', component: CRUD}
];
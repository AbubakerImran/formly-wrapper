import { Component } from "@angular/core";
import { RouterLink } from "@angular/router";

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="container-fluid vh-100 d-flex align-items-center justify-content-center">
      <div class="container bg-white w-50 h-75 p-5 d-flex flex-row justify-content-center align-items-center shadow gap-5">
        <a routerLink="/appComponent" class="btn btn-primary p-5">Bootstrap Forms</a>
        <a routerLink="/crud" class="btn btn-success p-5">Ng-Zorro Forms</a>
      </div>
    </div>
  `,
  styles: [`
    .container-fluid {
      background-color: #f5f5f5ff;
    }

    .container {
      border-radius: 30px
    }
  `]
})
export class Home {}

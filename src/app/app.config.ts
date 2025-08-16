import { ApplicationConfig, provideZoneChangeDetection, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { provideFormlyCore } from '@ngx-formly/core';
import { withFormlyBootstrap } from '@ngx-formly/bootstrap';
import { FormlyHorizontalWrapper } from './wrappers/horizontal-wrapper/horizontal-wrapper';
import { FormlyVerticalWrapper } from './wrappers/vertical-wrapper/vertical-wrapper';
import { FormlyModalWrapper } from './wrappers/modal-wrapper/modal-wrapper';

export const appConfig: ApplicationConfig = {
  providers: [
    provideFormlyCore([
      ...withFormlyBootstrap(),
      {
        wrappers: [
          { name: 'form-field-horizontal', component: FormlyHorizontalWrapper },
          { name: 'form-field-vertical', component: FormlyVerticalWrapper },
          { name: 'form-field-modal', component: FormlyModalWrapper },
        ]
      }
    ]),
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes)
  ]
};

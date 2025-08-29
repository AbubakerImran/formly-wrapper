import { ApplicationConfig, provideZoneChangeDetection, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { provideFormlyCore } from '@ngx-formly/core';
import { withFormlyBootstrap } from '@ngx-formly/bootstrap';
import { FormlyHorizontalWrapper } from './wrappers/horizontal-wrapper/horizontal-wrapper';
import { FormlyVerticalWrapper } from './wrappers/vertical-wrapper/vertical-wrapper';
import { FormlyModalWrapper } from './wrappers/modal-wrapper/modal-wrapper';
import { provideHttpClient } from '@angular/common/http';
import { provideNzIcons } from 'ng-zorro-antd/icon';
import { MailOutline, UserOutline } from '@ant-design/icons-angular/icons';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideNzI18n, en_US } from 'ng-zorro-antd/i18n';

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
    provideNzIcons([MailOutline, UserOutline]),
    provideAnimations(),
    provideNzI18n(en_US),
    provideHttpClient(),
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes)
  ]
};

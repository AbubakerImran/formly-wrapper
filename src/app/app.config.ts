import { ApplicationConfig, provideZoneChangeDetection, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { provideFormlyCore } from '@ngx-formly/core';
import { withFormlyBootstrap } from '@ngx-formly/bootstrap';
import { BootstrapHorizontalWrapper } from './wrappers/bootstrap-wrappers/horizontal-wrapper/horizontal-wrapper';
import { BootstrapVerticalWrapper } from './wrappers/bootstrap-wrappers/vertical-wrapper/vertical-wrapper';
import { FormlyModalWrapper } from './wrappers/modal-wrapper/modal-wrapper';
import { provideHttpClient } from '@angular/common/http';
import { provideNzIcons } from 'ng-zorro-antd/icon';
import { MailOutline, UserOutline } from '@ant-design/icons-angular/icons';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideNzI18n, en_US } from 'ng-zorro-antd/i18n';
import { NgZorroVerticalWrapper } from './wrappers/ng-zorro-wrappers/vertical-wrapper/vertical-wrapper';
import { NgZorroHorizontalWrapper } from './wrappers/ng-zorro-wrappers/horizontal-wrapper/horizontal-wrapper';

export const appConfig: ApplicationConfig = {
  providers: [
    provideFormlyCore([
      ...withFormlyBootstrap(),
      {
        wrappers: [
          { name: 'form-field-horizontal', component: BootstrapHorizontalWrapper },
          { name: 'form-field-vertical', component: BootstrapVerticalWrapper },
          { name: 'ngform-field-horizontal', component: NgZorroHorizontalWrapper },
          { name: 'ngform-field-vertical', component: NgZorroVerticalWrapper },
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

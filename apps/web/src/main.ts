import { bootstrapApplication } from '@angular/platform-browser';
import { registerLocaleData } from '@angular/common';
import localeEsHN from '@angular/common/locales/es-HN';
import { provideHttpClient } from '@angular/common/http';
import { AppComponent } from './app/app.component';

registerLocaleData(localeEsHN);
bootstrapApplication(AppComponent, { providers: [provideHttpClient()] }).catch((error: unknown) => console.error(error));

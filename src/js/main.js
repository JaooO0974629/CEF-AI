/**
 * Application bootstrap (composition root).
 *
 * Wires infrastructure, repositories, services and the presentation layer.
 * No other module is responsible for constructing these dependencies.
 */

import { EventBus } from './core/event-bus.js';
import { StorageAdapter } from './core/storage.js';
import {
  AllocationRepository,
  HistoryRepository,
  ProfileRepository,
  ToolBoxRepository,
  ToolRepository,
} from './data/repositories.js';
import { InventoryService } from './services/inventory-service.js';
import { ReportService } from './services/report-service.js';
import { App } from './ui/app.js';

function bootstrap() {
  const storage = new StorageAdapter();
  const bus = new EventBus();

  const inventory = new InventoryService({
    tools: new ToolRepository({ storage }),
    boxes: new ToolBoxRepository({ storage }),
    allocations: new AllocationRepository({ storage }),
    profiles: new ProfileRepository({ storage }),
    history: new HistoryRepository({ storage }),
    bus,
  });

  const reports = new ReportService({ inventory });
  const app = new App({ inventory, reports, bus });

  app.start();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap, { once: true });
} else {
  bootstrap();
}
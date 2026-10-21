import type { ExecutionContext } from '@nestjs/common';
import { Reflector, type ReflectableDecorator } from '@nestjs/core';
import type { ClassificationLevel, Permission } from '@huitong/shared';

/** Marks a route as reachable without signing in (the auth guard still identifies a caller if it can). */
export const Public = Reflector.createDecorator<true>({ transform: () => true });

/** Permissions the caller's role must hold; checked by the permissions guard. */
export const RequirePermissions = Reflector.createDecorator<Permission[], Permission[]>({
  transform: (permissions) => permissions,
});

/**
 * Skips the CSRF check. Only for routes that cannot carry the header and do
 * not act on a user's behalf: signed machine-to-machine webhooks and
 * anonymous analytics beacons.
 */
export const SkipCsrf = Reflector.createDecorator<true>({ transform: () => true });

export interface MaskFieldsSpec {
  /** Classification of each maskable field of the returned records. */
  classifications: Readonly<Record<string, ClassificationLevel>>;
  /** Field holding each record's entity code, used for entity-scoped clearance. */
  entityField: string;
}

/** Applies field-level masking to the records this route returns. */
export const MaskFields = Reflector.createDecorator<MaskFieldsSpec>();

/**
 * Marks a head-start route, or a whole controller, that serves typed sample
 * data instead of the real implementation. Its responses carry `meta.mock`,
 * so the UI labels them; the area's owner removes the decorator when the real
 * implementation lands.
 */
export const ServesMockData = Reflector.createDecorator<true>({ transform: () => true });

/**
 * Reads a decorator's metadata from the handler, falling back to its class.
 * Nest types the result as always present; it is undefined when the decorator
 * is absent, and this return type says so.
 */
export function readMetadata<T>(
  reflector: Reflector,
  decorator: ReflectableDecorator<T>,
  context: ExecutionContext,
): T | undefined {
  return reflector.getAllAndOverride(decorator, [context.getHandler(), context.getClass()]);
}

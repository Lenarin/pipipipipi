import Phaser from 'phaser';

/** The area between adjacent authored pipe poses, using Phaser geometry only. */
export function pipeRibbon(a: Phaser.Geom.Line, b: Phaser.Geom.Line): Phaser.Geom.Triangle[] {
  return [
    new Phaser.Geom.Triangle(a.x1, a.y1, a.x2, a.y2, b.x2, b.y2),
    new Phaser.Geom.Triangle(a.x1, a.y1, b.x2, b.y2, b.x1, b.y1),
  ];
}

/** Contact is current-frame sweep only. Visual afterimages never become hitboxes. */
export function sweptPipeContact(lines: readonly Phaser.Geom.Line[], target: Phaser.Geom.Rectangle, padding: number): Phaser.Types.Math.Vector2Like | null {
  const padded = new Phaser.Geom.Rectangle(target.x - padding, target.y - padding, target.width + padding * 2, target.height + padding * 2);
  const clamp = (point: Phaser.Types.Math.Vector2Like) => ({
    x: Phaser.Math.Clamp(point.x, target.left, target.right),
    y: Phaser.Math.Clamp(point.y, target.top, target.bottom),
  });
  for (const line of lines) {
    if (!Phaser.Geom.Intersects.LineToRectangle(line, padded)) continue;
    const intersections = Phaser.Geom.Intersects.GetLineToRectangle(line, padded);
    return clamp(intersections[0] ?? { x: (line.x1 + line.x2) / 2, y: (line.y1 + line.y2) / 2 });
  }
  for (let i = 1; i < lines.length; i++) for (const triangle of pipeRibbon(lines[i - 1], lines[i])) {
    if (Phaser.Geom.Triangle.Area(triangle) < .001 || !Phaser.Geom.Intersects.RectangleToTriangle(padded, triangle)) continue;
    const intersections = Phaser.Geom.Intersects.GetRectangleToTriangle(padded, triangle);
    // A small target can be fully inside the ribbon, with no edge intersection.
    return clamp(intersections[0] ?? { x: target.centerX, y: target.centerY });
  }
  return null;
}

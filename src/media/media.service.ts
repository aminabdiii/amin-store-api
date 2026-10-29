import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';
import { Database } from '../common/database.service';
import { configuration } from '../common/config';
import { fail } from '../common/http';
import { mediaUrl } from '../common/presenters';
export interface UploadedImage {
  buffer: Buffer;
  size: number;
  mimetype: string;
}
@Injectable()
export class MediaService {
  constructor(private readonly db: Database) {}
  async upload(file: UploadedImage | undefined, userId: string, avatar = false) {
    if (!file || file.size > 5 * 1024 * 1024)
      fail(400, 'INVALID_FILE', 'An image no larger than 5 MB is required');
    const formats: Record<string, string> = {
      'image/png': 'png',
      'image/jpeg': 'jpeg',
      'image/webp': 'webp',
    };
    if (!formats[file.mimetype])
      fail(400, 'INVALID_FILE_TYPE', 'PNG, JPEG and WebP images are supported');
    let buffer: Buffer;
    try {
      const image = sharp(file.buffer, { limitInputPixels: 20_000_000 });
      const metadata = await image.metadata();
      if (metadata.format !== formats[file.mimetype] || (metadata.pages ?? 1) > 1)
        throw new Error('Invalid format');
      buffer = await image.rotate().webp({ quality: 85 }).toBuffer();
    } catch {
      fail(400, 'INVALID_FILE', 'Image data is invalid or exceeds image limits');
    }
    if (buffer.length > 10 * 1024 * 1024)
      fail(400, 'INVALID_FILE', 'Processed image exceeds size limit');
    const config = configuration();
    const filename = randomUUID() + '.webp';
    const path = join(config.mediaDir, filename);
    await mkdir(config.mediaDir, { recursive: true, mode: 0o700 });
    await writeFile(path, buffer, { flag: 'wx', mode: 0o600 });
    try {
      const media = await this.db.transaction(async (tx) => {
        const item = await tx.media.create({
          data: { filename, mimeType: 'image/webp', size: buffer.length, uploaderId: userId },
        });
        if (avatar) await tx.user.update({ where: { id: userId }, data: { avatarId: item.id } });
        return item;
      });
      return {
        id: media.id,
        url: mediaUrl(media.filename),
        mimeType: media.mimeType,
        size: media.size,
      };
    } catch (error) {
      await unlink(path).catch(() => undefined);
      throw error;
    }
  }
}

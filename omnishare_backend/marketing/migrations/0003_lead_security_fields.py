from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('marketing', '0002_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='lead',
            name='e2e_enabled',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='lead',
            name='encrypted_message',
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name='lead',
            name='encryption_algorithm',
            field=models.CharField(default='AES-256-GCM', max_length=30),
        ),
        migrations.AddField(
            model_name='lead',
            name='encryption_iv',
            field=models.CharField(blank=True, max_length=120),
        ),
        migrations.AddField(
            model_name='lead',
            name='encryption_salt',
            field=models.CharField(blank=True, max_length=120),
        ),
        migrations.AddField(
            model_name='lead',
            name='message',
            field=models.TextField(blank=True),
        ),
    ]

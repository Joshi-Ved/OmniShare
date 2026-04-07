from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('listings', '0002_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='listing',
            name='insurance_plan',
            field=models.CharField(
                choices=[('basic', 'Basic'), ('standard', 'Standard'), ('premium', 'Premium')],
                default='basic',
                help_text='Insurance plan selected by the host for this listing',
                max_length=20,
            ),
        ),
    ]

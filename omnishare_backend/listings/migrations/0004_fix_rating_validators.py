from django.db import migrations, models
from django.core.validators import MaxValueValidator, MinValueValidator


class Migration(migrations.Migration):

    dependencies = [
        ('listings', '0003_listing_insurance_plan'),
    ]

    operations = [
        migrations.AlterField(
            model_name='listing',
            name='rating',
            field=models.DecimalField(
                decimal_places=2,
                default=0.0,
                max_digits=3,
                validators=[MinValueValidator(0), MaxValueValidator(5)],
            ),
        ),
        migrations.AlterField(
            model_name='review',
            name='rating',
            field=models.IntegerField(validators=[MinValueValidator(1), MaxValueValidator(5)]),
        ),
        migrations.AlterField(
            model_name='review',
            name='cleanliness_rating',
            field=models.IntegerField(
                blank=True,
                null=True,
                validators=[MinValueValidator(1), MaxValueValidator(5)],
            ),
        ),
        migrations.AlterField(
            model_name='review',
            name='accuracy_rating',
            field=models.IntegerField(
                blank=True,
                null=True,
                validators=[MinValueValidator(1), MaxValueValidator(5)],
            ),
        ),
        migrations.AlterField(
            model_name='review',
            name='value_rating',
            field=models.IntegerField(
                blank=True,
                null=True,
                validators=[MinValueValidator(1), MaxValueValidator(5)],
            ),
        ),
    ]

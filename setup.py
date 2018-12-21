from setuptools import setup

with open('README.md') as ldf:
    long_description = ldf.read()

setup(
    name='mockmeter',
    description='Simulate Mx50 embedded webserver',
    long_description=long_description,
    long_description_content_type='text/markdown',
    version='1.0.0',
    url='https://github.com/bitronics-llc/MockMeter',
    download_url='',
    author='Andre M. Wagner',
    author_email='andre.wagner@novatechweb.com',
    license='MIT',

    classifiers=[
        'Development Status :: 4 - Beta',
        'Intended Audience :: Developers',
        'License :: OSI Approved :: MIT License',

        'Programming Language :: Python :: 3',
        'Programming Language :: Python :: 3.6',
    ],

    keywords='Mx50',
    packages=['mockmeter'],
    # package_data={'mockmeter': ['../resources/*', '../resources/mx50/web_pages/*']},

    install_requires=['CherryPy>=3', 'requests>=2', 'python-slugify'],

    entry_points={
        'console_scripts': [
            'mkmx50 = mockmeter.mockmeter',
        ],
    }
)

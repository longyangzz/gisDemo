var Nav = React.createClass({
    render: function() {
        return <div className='col-xs-12 col-sm-5' id='navbar'>
            <ul
                id='navbarUl'
                className=
                    'nav navbar-nav navbar-right nav-pills'
            >
                <li>
                    { this.props.children }
                </li>
            </ul>
        </div>;
    }
});

var Header = React.createClass({
    render: function() {
        return (
            <div className='navbar navbar-default' id='header'>
                <div className='container-fluid'>
                    <div className='row'>
                        <div className='col-xs-12 col-sm-7'>
                            <a href='/'>
                                <img
                                    id='banner'
                                    src='resources/images/banner.png'
                                />
                            </a>
                        </div>

                    </div>
                </div>
            </div>
        );
    }
});

var Footer = React.createClass({
    render: function() {
        return (
            <footer className='footer'>
                <div className='container-fluid'>
                    <div className='footer-content'>
                        <div className='row'>
                            <div className='col-xs-5'></div>
                            <div className='col-xs-2'>
                                <a href='/'>
                                    <img
                                        className='center-block'
                                        id='footer-icon'
                                        src='resources/images/logo.png'
                                    />
                                </a>
                            </div>
                            <div className='col-xs-5'>
                                <p id='copyright'>
                                    gis © lyzz
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </footer>
        );
    }
});

var Thumb = React.createClass({
    render: function() {
        var r = this.props.resource;
        var href = '/' + (r.old ? 'old/' : '') + 'example/' + r.page + '.html';
        var oldhref = '/old/data/' + r.page + '.html';

        var ext = [
                <img
                    className='flag'
                    title='Served via third-party'
                    src='resources/icons/goto.svg'
                />
        ];

        var na = [
            <a href={ href }>
                <img
                    className='flag'
                    title='Served from NA'
                    src='resources/icons/na.svg'
                />
            </a>
        ];

        // For now EU versions are not updated.
        var eu = [
            <a href={ ext ? href : oldhref + '?location=eu-c.entwine.io' }>
                <img
                    className='flag'
                    title='Served from EU'
                    src='resources/icons/eu.svg'
                />
            </a>
        ]

        var flags = []
        if (r.eu) flags = flags.concat(eu)
        if (r.na) flags = flags.concat(na)
        if (r.ext) flags = flags.concat(ext)

        return <div className='col-xs-6 col-sm-4'>
            <a href={ href }>
                <img
                    className='img-responsive thumb img-thumbnail'
                    src={ 'resources/images/' + r.page + '.' + r.postfix }

                />
            </a>
            <p className='lead center-block'>{ r.name } { flags }</p>
        </div>;
    }
});

var Resource = function(name, page, params, postfix) {
    if(postfix == undefined)
    {
        postfix = "jpg";
    }
    this.name = name;
    this.page = page;
    this.na = params.na;
    this.eu = params.eu;
    this.ext = params.ext;
    this.postfix = postfix;
};

var Page = React.createClass({
    render: function() {
        var na = { na: true };
        var eu = { eu: true };
        var both = { na: true, eu: true };

        var resources = [
            new Resource('Red Rocks Amphitheatre', 'red-rocks', both),
            new Resource('cesium风场', 'demo1-CesiumWind', both, "gif"),
            new Resource('openlayer-json', 'ol-json等值面测试', both),
            new Resource('mapbox测试', 'mapbox-baseDEMO', both, "png"),

        ];

        return <div>
            <Header/>
                <div className='container-fluid'>
                    <div className='row'>
                        <div
                            className='col-xs-12'
                            style={ { paddingBottom: 64 } }
                        >
                            <h2
                                className='center-block row'
                                style={ {
                                    color: '#192854',
                                    paddingTop: 36,
                                    paddingBottom: 24
                                } }
                            >
                                gisDemo for user
                            </h2>

                            {
                                resources.map((v, i) =>
                                        <Thumb
                                            key={ i }
                                            resource={ v }
                                            name={ v.name }
                                            href={ v.page }
                                            src={ v.image }/>)
                            }
                        </div>
                    </div>
                </div>
            <Footer/>
        </div>;
    }
});

ReactDOM.render(<Page/>, document.getElementById('app'));

